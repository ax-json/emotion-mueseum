# Emotion Museum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anonymous web artwork: journal your day → AI extracts 3-beat emotional arc → triptych painting forms while your words dissolve → painting hangs in a shared 3D night-museum beside strangers who felt the same.

**Architecture:** Server-centric Next.js monolith (App Router). All AI + safety at API-route choke points; keys server-side. Supabase = corpus (Postgres), images (Storage), live museum growth (Realtime). 3D museum = React Three Fiber on a rails camera. Every failure resolves to a particle-painting, never an error screen.

**Tech Stack:** Next.js 15 (App Router, TS), React 19, react-three-fiber + drei, Supabase JS v2, @google/genai (Gemini text + image), Higgsfield REST (optional provider), Vitest, Playwright. No Tailwind — hand-rolled CSS (museum-at-night aesthetic).

## Global Constraints

- Journal text is NEVER persisted or logged — no DB column for it, no `console.log` of it, held in request scope only.
- No error screen is ever shown — every failure path resolves per spec §7 (particle fallbacks, solo mode, resting mode).
- No names/identity anywhere: plaques show arc words + time only. No users table, no auth.
- All API keys server-side only (`GEMINI_API_KEY`, `HF_API_KEY`, `HF_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`). Client gets only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (read-only via RLS).
- Image provider selected by `IMAGE_PROVIDER` env: `gemini` (default) | `higgsfield` | `mock`.
- Rate limits: 3 paintings/hour per session, 20 lights/day per session, global `DAILY_PAINTING_CAP` (default 150) → "museum is resting" browse-only mode.
- `MOCK_AI=1` env bypasses Gemini with deterministic fixtures (used by E2E; never set in production).
- Emotion basis (order is canonical everywhere): `joy, sadness, anger, fear, calm, anticipation, loneliness, love`.
- Node 20+, npm. App lives at repo root (`hack the arts/`). Project journal rule: after each task's commit, append one Edit Log line to `JOURNAL.md` (date, time, files, change).

---

## File structure

```
app/
  layout.tsx  globals.css  page.tsx            # journey: journal→confirm→dissolve→reveal→museum
  museum/page.tsx                              # browse-only entry
  about/page.tsx
  api/journal/route.ts  api/paint/route.ts  api/kin/route.ts  api/light/route.ts
src/lib/
  emotion.ts        # vectors, cosine, valence/arousal, palettes, wallPosition (pure)
  extract.ts        # analyzeJournal (Gemini), blendVec (pure)
  ratelimit.ts      # DB-backed counters (pure decision fn + query helpers)
  supabase.ts       # server (service-role) + browser (anon) clients
  session.ts        # client session id + server salted hash
src/lib/providers/
  types.ts  gemini.ts  higgsfield.ts  mock.ts  index.ts (pick by env)
src/components/
  JournalScreen.tsx  ArcConfirm.tsx  DissolveCanvas.tsx  TriptychReveal.tsx  ParticlePanel.tsx
src/components/museum/
  MuseumScene.tsx  GalleryRoom.tsx  PaintingFrame.tsx  MuralWall.tsx  RailsCamera.tsx  FlatGallery.tsx
scripts/seed.mjs  supabase/schema.sql
tests/ (vitest unit)  e2e/journey.spec.ts (playwright)
```

---

### Task 1: Scaffold Next.js app + toolchain

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `.env.example`, `.gitignore`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`

**Interfaces:**
- Produces: running dev server; `npm test` (vitest); CSS variables `--bg --ink --dim --accent --serif` used by all UI tasks.

- [ ] **Step 1: Write config + skeleton files**

`package.json`:
```json
{
  "name": "emotion-museum",
  "private": true,
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start", "test": "vitest run --passWithNoTests", "test:watch": "vitest" },
  "dependencies": {
    "next": "^15.3.0", "react": "^19.0.0", "react-dom": "^19.0.0",
    "three": "^0.175.0", "@react-three/fiber": "^9.1.0", "@react-three/drei": "^10.0.0",
    "@supabase/supabase-js": "^2.45.0", "@google/genai": "^1.9.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0", "@types/react": "^19.0.0", "@types/node": "^22.0.0", "@types/three": "^0.175.0",
    "vitest": "^3.0.0", "@playwright/test": "^1.50.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["dom", "dom.iterable", "esnext"], "allowJs": true, "skipLibCheck": true,
    "strict": true, "noEmit": true, "esModuleInterop": true, "module": "esnext", "moduleResolution": "bundler",
    "resolveJsonModule": true, "isolatedModules": true, "jsx": "preserve", "incremental": true,
    "plugins": [{ "name": "next" }], "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"], "exclude": ["node_modules"]
}
```

`next.config.mjs`: `export default { reactStrictMode: true }`

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import path from 'path'
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

`.env.example`:
```
GEMINI_API_KEY=your-gemini-key
IMAGE_PROVIDER=gemini            # gemini | higgsfield | mock
HF_API_KEY=                      # only if IMAGE_PROVIDER=higgsfield
HF_SECRET=
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
SESSION_SALT=any-long-random-string
DAILY_PAINTING_CAP=150
# MOCK_AI=1                      # test/e2e only — deterministic arcs, no Gemini calls
```

`.gitignore`: `node_modules/`, `.next/`, `.env`, `.env*.local`, `test-results/`, `playwright-report/`

`app/layout.tsx`:
```tsx
import './globals.css'
export const metadata = { title: 'Emotion Museum', description: 'Your day, hung among strangers who felt the same.' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
```

`app/globals.css`:
```css
:root { --bg:#0e0d0b; --ink:#e8e2d6; --dim:#8d8578; --accent:#c9a86a; --serif:"Georgia","Times New Roman",serif; }
* { box-sizing:border-box; margin:0; }
body { background:var(--bg); color:var(--ink); font-family:var(--serif); min-height:100dvh; }
button { font:inherit; cursor:pointer; }
.plaque { font-style:italic; color:var(--dim); letter-spacing:.06em; }
```

`app/page.tsx` (placeholder until Task 8):
```tsx
export default function Home() { return <main style={{ padding: '20vh 2rem', textAlign: 'center' }}><h1>the museum is being built</h1></main> }
```

- [ ] **Step 2: Install and verify dev server**

Run: `npm install && npm run dev` → open http://localhost:3000
Expected: dark page, "the museum is being built".

- [ ] **Step 3: Verify vitest runs**

Run: `npm test`
Expected: exit 0 ("no test files" tolerated by `--passWithNoTests`).

- [ ] **Step 4: Commit + journal**

```bash
git add -A && git commit -m "chore: scaffold Next.js app, vitest, env template"
```
Append Edit Log line to `JOURNAL.md` (date, time, files, change) and include in commit or follow-up.

---

### Task 2: Emotion core library (pure, TDD)

**Files:**
- Create: `src/lib/emotion.ts`
- Test: `tests/emotion.test.ts`

**Interfaces:**
- Produces (exact — all later tasks import these):
```ts
export const EMOTIONS = ['joy','sadness','anger','fear','calm','anticipation','loneliness','love'] as const
export type Emotion = typeof EMOTIONS[number]
export type EmotionVec = number[]                    // length 8, each 0..1
export interface ArcBeat { word: string; emotion: Emotion; intensity: number } // intensity 0..1
export function cosineSim(a: EmotionVec, b: EmotionVec): number      // 0 when either is zero-vec
export function valence(v: EmotionVec): number                       // -1..1
export function arousal(v: EmotionVec): number                       // 0..1
export function paletteFor(e: Emotion): string[]                     // 3 hexes
export function wallPosition(val: number, ar: number, seed: number): { x:number; y:number; z:number }
export function topKin<T extends { emotion_vec: EmotionVec }>(vec: EmotionVec, rows: T[], n: number): T[]
```

- [ ] **Step 1: Write failing tests**

`tests/emotion.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { EMOTIONS, cosineSim, valence, arousal, paletteFor, wallPosition, topKin } from '@/lib/emotion'

const vec = (e: string, x = 1) => EMOTIONS.map(k => (k === e ? x : 0))

describe('cosineSim', () => {
  it('identical vectors → 1', () => expect(cosineSim(vec('joy'), vec('joy'))).toBeCloseTo(1))
  it('orthogonal → 0', () => expect(cosineSim(vec('joy'), vec('sadness'))).toBeCloseTo(0))
  it('zero vector → 0, no NaN', () => expect(cosineSim(vec('joy', 0), vec('joy'))).toBe(0))
})

describe('valence/arousal', () => {
  it('pure joy: positive valence, mid-high arousal', () => {
    expect(valence(vec('joy'))).toBeGreaterThan(0.5)
    expect(arousal(vec('joy'))).toBeGreaterThan(0.4)
  })
  it('pure loneliness: negative valence, low arousal', () => {
    expect(valence(vec('loneliness'))).toBeLessThan(-0.5)
    expect(arousal(vec('loneliness'))).toBeLessThan(0.4)
  })
  it('bounded for all-ones vector', () => {
    const all = EMOTIONS.map(() => 1)
    expect(valence(all)).toBeGreaterThanOrEqual(-1); expect(valence(all)).toBeLessThanOrEqual(1)
    expect(arousal(all)).toBeGreaterThanOrEqual(0); expect(arousal(all)).toBeLessThanOrEqual(1)
  })
})

describe('paletteFor', () => {
  it('3 hex strings per emotion', () => EMOTIONS.forEach(e => {
    const p = paletteFor(e); expect(p).toHaveLength(3); p.forEach(h => expect(h).toMatch(/^#[0-9a-f]{6}$/i))
  }))
})

describe('wallPosition', () => {
  it('deterministic for same seed', () => expect(wallPosition(0.5, 0.5, 7)).toEqual(wallPosition(0.5, 0.5, 7)))
  it('valence maps left/right', () => expect(wallPosition(-1, 0.5, 1).x).toBeLessThan(wallPosition(1, 0.5, 1).x))
  it('arousal maps height within reach', () => {
    const lo = wallPosition(0, 0, 1).y, hi = wallPosition(0, 1, 1).y
    expect(hi).toBeGreaterThan(lo); expect(lo).toBeGreaterThan(0.5); expect(hi).toBeLessThan(3.2)
  })
})

describe('topKin', () => {
  const mixed = EMOTIONS.map(k => (k === 'joy' ? 0.9 : k === 'loneliness' ? 0.4 : 0))
  const rows = [
    { id: 'a', emotion_vec: vec('joy') }, { id: 'b', emotion_vec: vec('sadness') },
    { id: 'c', emotion_vec: vec('loneliness') }, { id: 'd', emotion_vec: mixed },
  ]
  it('ranks matching emotion first', () => {
    const k = topKin(vec('joy'), rows, 2)
    expect(k[0].id).toBe('a'); expect(k[1].id).toBe('d')
  })
  it('respects n', () => expect(topKin(vec('joy'), rows, 1)).toHaveLength(1))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — "Cannot find module '@/lib/emotion'".

- [ ] **Step 3: Write implementation**

`src/lib/emotion.ts`:
```ts
export const EMOTIONS = ['joy','sadness','anger','fear','calm','anticipation','loneliness','love'] as const
export type Emotion = typeof EMOTIONS[number]
export type EmotionVec = number[]
export interface ArcBeat { word: string; emotion: Emotion; intensity: number }

export function cosineSim(a: EmotionVec, b: EmotionVec): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < 8; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2 }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// weights follow canonical order: joy,sadness,anger,fear,calm,anticipation,loneliness,love
const VAL_W = [1, -1, -0.8, -0.9, 0.7, 0.3, -1, 1]
const ARO_W = [0.6, 0.25, 0.9, 0.8, 0.05, 0.7, 0.3, 0.4]
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

export function valence(v: EmotionVec): number {
  const s = v.reduce((acc, x, i) => acc + x * VAL_W[i], 0)
  return clamp(s / Math.max(1, v.reduce((a, x) => a + x, 0)), -1, 1)
}
export function arousal(v: EmotionVec): number {
  const total = v.reduce((a, x) => a + x, 0)
  if (total === 0) return 0
  return clamp(v.reduce((acc, x, i) => acc + x * ARO_W[i], 0) / total, 0, 1)
}

const PALETTES: Record<Emotion, string[]> = {
  joy:          ['#d9a441', '#f2d49b', '#8a5a2b'],
  sadness:      ['#4a5d73', '#7d8fa3', '#2c3644'],
  anger:        ['#8e2f2f', '#c05a3e', '#1f1512'],
  fear:         ['#4b3a5e', '#2a2136', '#7a6b91'],
  calm:         ['#7d8f74', '#d8d3c0', '#5a6b55'],
  anticipation: ['#3f7d7a', '#c9a86a', '#28504e'],
  loneliness:   ['#3a4468', '#6b729a', '#23283d'],
  love:         ['#a05a6b', '#d8a48f', '#5e3340'],
}
export function paletteFor(e: Emotion): string[] { return PALETTES[e] }

export function wallPosition(val: number, ar: number, seed: number) {
  const jitter = (((seed * 2654435761) >>> 0) % 1000) / 1000 - 0.5   // deterministic -0.5..0.5
  return { x: clamp(val, -1, 1) * 6 + jitter * 0.8, y: 1.1 + clamp(ar, 0, 1) * 1.8, z: -4.9 }
}

export function topKin<T extends { emotion_vec: EmotionVec }>(vec: EmotionVec, rows: T[], n: number): T[] {
  return rows.map(r => ({ r, s: cosineSim(vec, r.emotion_vec) })).sort((a, b) => b.s - a.s).slice(0, n).map(x => x.r)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, all suites green.

- [ ] **Step 5: Commit + journal line**

```bash
git add -A && git commit -m "feat: emotion core — vectors, valence/arousal, palettes, wall placement, kin ranking"
```

---

### Task 3: Supabase schema + clients + sessions

**Files:**
- Create: `supabase/schema.sql`, `src/lib/supabase.ts`, `src/lib/session.ts`
- Test: `tests/session.test.ts`

**Interfaces:**
- Produces: `serverDb()` (service-role client), `browserDb()` (anon client), `sessionHash(sessionId: string): string` (server-only), `getSessionId(): string` (browser, localStorage).
- Tables `paintings` + `lights_log` and function `increment_lights(pid uuid)` — API tasks depend on these exact names.

- [ ] **Step 1: Write schema**

`supabase/schema.sql`:
```sql
create table paintings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  arc_words text[] not null check (array_length(arc_words, 1) = 3),
  emotion_vec float8[] not null check (array_length(emotion_vec, 1) = 8),
  valence float8 not null,
  arousal float8 not null,
  panel_urls text[] not null,          -- length 3; '' element => client renders ParticlePanel
  palette jsonb not null,              -- [["#hex","#hex","#hex"] x3] assigned at composition time
  lights int not null default 0,
  is_seed boolean not null default false,
  session_hash text not null
);
create index paintings_created_idx on paintings (created_at desc);

create table lights_log (
  painting_id uuid references paintings(id),
  session_hash text not null,
  created_at timestamptz not null default now(),
  primary key (painting_id, session_hash)
);

create or replace function increment_lights(pid uuid) returns int language sql as
$$ update paintings set lights = lights + 1 where id = pid returning lights; $$;

alter table paintings enable row level security;
alter table lights_log enable row level security;
create policy "public read paintings" on paintings for select using (true);
-- no public insert/update policies: all writes go through API routes using the service role
```

- [ ] **Step 2: Apply schema**

Supabase dashboard → SQL editor → paste, Run. Storage → create public bucket `panels`. Database → Replication → enable Realtime for `paintings`.
Expected: both tables in Table Editor; bucket exists.

- [ ] **Step 3: Write failing test for sessionHash**

`tests/session.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { sessionHash } from '@/lib/session'
beforeAll(() => { process.env.SESSION_SALT = 'test-salt' })
describe('sessionHash', () => {
  it('deterministic', () => expect(sessionHash('abc')).toBe(sessionHash('abc')))
  it('different ids differ', () => expect(sessionHash('abc')).not.toBe(sessionHash('abd')))
  it('does not leak the raw id', () => expect(sessionHash('secret-id')).not.toContain('secret-id'))
})
```

Run: `npm test` → FAIL (module not found).

- [ ] **Step 4: Implement**

`src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js'
export function serverDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}
export function browserDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
```

`src/lib/session.ts`:
```ts
import { createHash } from 'crypto'

// server-only (node crypto) — import ONLY from API routes
export function sessionHash(sessionId: string): string {
  return createHash('sha256').update(process.env.SESSION_SALT + ':' + sessionId).digest('hex').slice(0, 32)
}

// browser-only (Web Crypto) — import ONLY from client components
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('museum-session')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('museum-session', id) }
  return id
}
```
If Next flags node `crypto` in a client bundle, split into `session.server.ts` / `session.client.ts` keeping the same two function names.

- [ ] **Step 5: Run tests → pass.** `npm test`.

- [ ] **Step 6: Commit + journal line**

```bash
git add -A && git commit -m "feat: supabase schema + clients, anonymous salted sessions"
```

---

### Task 4: Journal analysis — `analyzeJournal` + `blendVec` (TDD, Gemini mocked)

**Files:**
- Create: `src/lib/extract.ts`
- Test: `tests/extract.test.ts`

**Interfaces:**
- Consumes: `EMOTIONS`, `ArcBeat`, `EmotionVec` from `@/lib/emotion`.
- Produces:
```ts
export interface JournalAnalysis { beats: ArcBeat[]; crisis: boolean; abusive: boolean }
export function blendVec(beats: ArcBeat[]): EmotionVec        // sum(intensity)/3 per emotion, clamp 1
export async function analyzeJournal(text: string): Promise<JournalAnalysis>   // MOCK_AI=1 → fixtures
```
- Mock hooks for tests/E2E: text containing `MOCKCRISIS` → crisis:true; `MOCKABUSE` → abusive:true.

- [ ] **Step 1: Write failing tests**

`tests/extract.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { blendVec, analyzeJournal } from '@/lib/extract'
import { EMOTIONS } from '@/lib/emotion'

describe('blendVec', () => {
  it('sums beat intensities per emotion / 3', () => {
    const v = blendVec([
      { word: 'anxious', emotion: 'fear', intensity: 0.9 },
      { word: 'lifted', emotion: 'joy', intensity: 0.6 },
      { word: 'lonely', emotion: 'loneliness', intensity: 0.9 },
    ])
    expect(v[EMOTIONS.indexOf('fear')]).toBeCloseTo(0.3)
    expect(v[EMOTIONS.indexOf('joy')]).toBeCloseTo(0.2)
    expect(v[EMOTIONS.indexOf('sadness')]).toBe(0)
    expect(v).toHaveLength(8)
  })
  it('repeated emotion accumulates', () => {
    const v = blendVec([
      { word: 'sad', emotion: 'sadness', intensity: 0.9 },
      { word: 'down', emotion: 'sadness', intensity: 0.9 },
      { word: 'heavy', emotion: 'sadness', intensity: 0.9 },
    ])
    expect(v[EMOTIONS.indexOf('sadness')]).toBeCloseTo(0.9)
  })
})

describe('analyzeJournal with MOCK_AI', () => {
  beforeEach(() => { process.env.MOCK_AI = '1' })
  it('3 beats, valid emotions, no crisis for plain text', async () => {
    const a = await analyzeJournal('long day at work but dinner with a friend helped')
    expect(a.beats).toHaveLength(3)
    a.beats.forEach(b => expect(EMOTIONS).toContain(b.emotion))
    expect(a.crisis).toBe(false)
  })
  it('mock crisis hook', async () => {
    const a = await analyzeJournal('MOCKCRISIS today')
    expect(a.crisis).toBe(true)
  })
})
```

- [ ] **Step 2: Run → FAIL** (module not found).

- [ ] **Step 3: Implement**

`src/lib/extract.ts`:
```ts
import { GoogleGenAI } from '@google/genai'
import { EMOTIONS, type ArcBeat, type Emotion, type EmotionVec } from '@/lib/emotion'

export interface JournalAnalysis { beats: ArcBeat[]; crisis: boolean; abusive: boolean }

export function blendVec(beats: ArcBeat[]): EmotionVec {
  const v = EMOTIONS.map(() => 0)
  for (const b of beats) v[EMOTIONS.indexOf(b.emotion)] += b.intensity / 3
  return v.map(x => Math.min(1, x))
}

const PROMPT = `You analyze one private journal entry about someone's day. Reply with STRICT JSON only:
{"beats":[{"word":string,"emotion":string,"intensity":number},{...},{...}],"crisis":boolean,"abusive":boolean}
Rules: exactly 3 beats = the emotional arc in chronological order (beginning, middle, end of the day).
"word": ONE lowercase feeling word in the writer's own register. "emotion": exactly one of ${EMOTIONS.join(', ')}.
"intensity": 0..1. "crisis": true only if the entry signals self-harm or suicide risk.
"abusive": true only if the entry is hate speech, slurs, or spam unrelated to feelings.
Entry:
`

function mockAnalysis(text: string): JournalAnalysis {
  return {
    beats: [
      { word: 'anxious', emotion: 'fear', intensity: 0.7 },
      { word: 'lifted', emotion: 'joy', intensity: 0.6 },
      { word: 'lonely', emotion: 'loneliness', intensity: 0.8 },
    ],
    crisis: text.includes('MOCKCRISIS'),
    abusive: text.includes('MOCKABUSE'),
  }
}

export async function analyzeJournal(text: string): Promise<JournalAnalysis> {
  if (process.env.MOCK_AI === '1') return mockAnalysis(text)
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: PROMPT + text,
    config: { responseMimeType: 'application/json', temperature: 0.4 },
  })
  const raw = JSON.parse(res.text ?? '{}')
  const beats: ArcBeat[] = (raw.beats ?? []).slice(0, 3).map((b: Record<string, unknown>) => ({
    word: String(b.word ?? 'quiet').toLowerCase().slice(0, 24),
    emotion: (EMOTIONS as readonly string[]).includes(String(b.emotion)) ? (b.emotion as Emotion) : 'calm',
    intensity: Math.min(1, Math.max(0, Number(b.intensity) || 0.5)),
  }))
  while (beats.length < 3) beats.push({ word: 'quiet', emotion: 'calm', intensity: 0.4 })
  return { beats, crisis: Boolean(raw.crisis), abusive: Boolean(raw.abusive) }
}
```

- [ ] **Step 4: Run → PASS.** `npm test`.

- [ ] **Step 5: Live smoke (manual, once)**

Create `scripts/smoke-extract.mjs` that imports the compiled fn is awkward in TS — simplest: temporary route-less check via `npx tsx`:
`GEMINI_API_KEY=<key> npx tsx --eval "import('./src/lib/extract').then(async m => console.log(JSON.stringify(await m.analyzeJournal('rough morning, good lunch, quiet night'), null, 2)))"`
Expected: 3 sensible beats, crisis:false. Confirms model id + JSON mode live.

- [ ] **Step 6: Commit + journal line**

```bash
git add -A && git commit -m "feat: journal arc extraction with crisis/abuse classification + deterministic mock"
```

---

### Task 5: `/api/journal` + DB-backed rate limits

**Files:**
- Create: `src/lib/ratelimit.ts`, `app/api/journal/route.ts`
- Test: `tests/ratelimit.test.ts`

**Interfaces:**
- Consumes: `analyzeJournal`, `sessionHash`, `serverDb`.
- Produces route contract (Task 8 client depends on exact shapes):
  - `POST /api/journal`, body `{ text: string }`, header `x-session-id`.
  - Always HTTP 200 with one of: `{ status:'ok', beats: ArcBeat[] }` | `{ status:'crisis' }` | `{ status:'rejected' }` | `{ status:'limited' }` | `{ status:'resting' }`.
  - Internal analysis failure → `{ status:'ok', beats: keywordFallback(text) }` (spec §7: never an error).
- Produces lib fns: `decideLimit(hourCount, dayGlobal, cap): 'ok'|'limited'|'resting'`, `checkLimits(db, hash): Promise<same>`, `keywordFallback(text): ArcBeat[]`.

- [ ] **Step 1: Write failing tests (pure parts)**

`tests/ratelimit.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { decideLimit, keywordFallback } from '@/lib/ratelimit'
import { EMOTIONS } from '@/lib/emotion'

describe('decideLimit', () => {
  it('under caps → ok', () => expect(decideLimit(2, 10, 150)).toBe('ok'))
  it('3 in last hour → limited', () => expect(decideLimit(3, 10, 150)).toBe('limited'))
  it('global cap → resting (wins over limited)', () => expect(decideLimit(3, 150, 150)).toBe('resting'))
})
describe('keywordFallback', () => {
  it('always 3 valid beats', () => {
    const b = keywordFallback('i felt sad then angry then okay')
    expect(b).toHaveLength(3); b.forEach(x => expect(EMOTIONS).toContain(x.emotion))
  })
  it('picks up obvious words', () => {
    expect(keywordFallback('lonely all evening').some(x => x.emotion === 'loneliness')).toBe(true)
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

`src/lib/ratelimit.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { type ArcBeat, type Emotion } from '@/lib/emotion'

export function decideLimit(hourCount: number, dayGlobal: number, cap: number): 'ok' | 'limited' | 'resting' {
  if (dayGlobal >= cap) return 'resting'
  if (hourCount >= 3) return 'limited'
  return 'ok'
}

export async function checkLimits(db: SupabaseClient, hash: string): Promise<'ok' | 'limited' | 'resting'> {
  const hourAgo = new Date(Date.now() - 3600_000).toISOString()
  const dayAgo = new Date(Date.now() - 86400_000).toISOString()
  const [mine, all] = await Promise.all([
    db.from('paintings').select('id', { count: 'exact', head: true }).eq('session_hash', hash).gte('created_at', hourAgo),
    db.from('paintings').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
  ])
  return decideLimit(mine.count ?? 0, all.count ?? 0, Number(process.env.DAILY_PAINTING_CAP ?? 150))
}

const KEYWORDS: [RegExp, Emotion][] = [
  [/lonel|alone|miss/i, 'loneliness'], [/sad|down|cried|heavy/i, 'sadness'],
  [/angr|furious|mad|annoy/i, 'anger'], [/anxi|afraid|scared|worr|stress/i, 'fear'],
  [/calm|peace|quiet|okay|fine/i, 'calm'], [/excit|hope|forward|nervous/i, 'anticipation'],
  [/love|warm|friend|together/i, 'love'], [/happ|joy|laugh|great|good/i, 'joy'],
]
export function keywordFallback(text: string): ArcBeat[] {
  const found = KEYWORDS.filter(([re]) => re.test(text)).map(([, e]) => e)
  const picks: Emotion[] = [found[0] ?? 'calm', found[1] ?? found[0] ?? 'calm', found[2] ?? found[found.length - 1] ?? 'calm']
  return picks.map(e => ({ word: e === 'calm' ? 'quiet' : e, emotion: e, intensity: 0.5 }))
}
```

`app/api/journal/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { analyzeJournal } from '@/lib/extract'
import { checkLimits, keywordFallback } from '@/lib/ratelimit'
import { sessionHash } from '@/lib/session'
import { serverDb } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const hash = sessionHash(req.headers.get('x-session-id') ?? 'anon')
  const { text } = await req.json().catch(() => ({ text: '' }))
  if (typeof text !== 'string' || text.trim().length < 3) return NextResponse.json({ status: 'rejected' })
  const trimmed = text.slice(0, 600)            // request scope only — never logged, never stored

  const limit = await checkLimits(serverDb(), hash).catch(() => 'ok' as const)   // DB down must not block art
  if (limit !== 'ok') return NextResponse.json({ status: limit })

  try {
    const a = await analyzeJournal(trimmed)
    if (a.crisis) return NextResponse.json({ status: 'crisis' })
    if (a.abusive) return NextResponse.json({ status: 'rejected' })
    return NextResponse.json({ status: 'ok', beats: a.beats })
  } catch {
    return NextResponse.json({ status: 'ok', beats: keywordFallback(trimmed) })
  }
}
```

- [ ] **Step 4: Run unit tests → PASS. Manual route check:**

Run dev with `MOCK_AI=1`, then:
`curl -s localhost:3000/api/journal -H 'content-type: application/json' -H 'x-session-id: t1' -d '{"text":"rough morning, better evening"}'` → `{"status":"ok","beats":[…3…]}`
`… -d '{"text":"MOCKCRISIS"}'` → `{"status":"crisis"}`

- [ ] **Step 5: Commit + journal line**

```bash
git add -A && git commit -m "feat: /api/journal — analysis, crisis/abuse paths, db-backed rate limits, keyword fallback"
```

---

### Task 6: Image providers (gemini + higgsfield + mock, TDD)

**Files:**
- Create: `src/lib/providers/types.ts`, `src/lib/providers/gemini.ts`, `src/lib/providers/higgsfield.ts`, `src/lib/providers/mock.ts`, `src/lib/providers/index.ts`
- Test: `tests/providers.test.ts`

**Interfaces:**
- Produces:
```ts
// types.ts
export interface PanelRequest { arcWord: string; emotion: Emotion; intensity: number; palette: string[] }
export interface ImageProvider { name: string; generatePanel(req: PanelRequest): Promise<Uint8Array> }
export function panelPrompt(req: PanelRequest): string          // lives in types.ts to avoid import cycles
// index.ts
export function getProvider(): ImageProvider                    // IMAGE_PROVIDER env: higgsfield|mock|default gemini
export { panelPrompt } from './types'
```

- [ ] **Step 1: Write failing tests**

`tests/providers.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { panelPrompt, getProvider } from '@/lib/providers'

const req = { arcWord: 'lonely', emotion: 'loneliness' as const, intensity: 0.8, palette: ['#3a4468', '#6b729a', '#23283d'] }

describe('panelPrompt', () => {
  it('contains palette hexes and arc word', () => {
    const p = panelPrompt(req)
    expect(p).toContain('#3a4468'); expect(p.toLowerCase()).toContain('lonely')
  })
  it('painterly constraints, forbids text/faces', () => {
    const p = panelPrompt(req).toLowerCase()
    expect(p).toMatch(/impasto|gouache|brush/); expect(p).toMatch(/no text/); expect(p).toMatch(/no faces|faceless/)
  })
})
describe('getProvider', () => {
  it('mock env → mock provider returns valid bytes', async () => {
    process.env.IMAGE_PROVIDER = 'mock'
    const prov = getProvider()
    expect(prov.name).toBe('mock')
    const bytes = await prov.generatePanel(req)
    expect(bytes.byteLength).toBeGreaterThan(50)
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

`src/lib/providers/types.ts`:
```ts
import type { Emotion } from '@/lib/emotion'

export interface PanelRequest { arcWord: string; emotion: Emotion; intensity: number; palette: string[] }
export interface ImageProvider { name: string; generatePanel(req: PanelRequest): Promise<Uint8Array> }

export function panelPrompt(req: PanelRequest): string {
  const strength = req.intensity > 0.66 ? 'intense, saturated' : req.intensity > 0.33 ? 'present, breathing' : 'faint, receding'
  return [
    `Abstract expressionist painting of the feeling "${req.arcWord}" (${req.emotion}), ${strength}.`,
    `Strictly limited palette: ${req.palette.join(', ')} on a deep charcoal ground.`,
    `Thick impasto and dry-brush gouache texture, visible canvas grain, physical paint.`,
    `No text, no letters, no numbers. No faces, no figures — faceless abstraction only.`,
    `Museum-quality single cohesive composition, moody low-key gallery lighting.`,
  ].join(' ')
}
```

`src/lib/providers/gemini.ts`:
```ts
import { GoogleGenAI } from '@google/genai'
import { panelPrompt, type ImageProvider } from './types'

export const geminiProvider: ImageProvider = {
  name: 'gemini',
  async generatePanel(req) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: panelPrompt(req) })
    for (const part of res.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) return Uint8Array.from(Buffer.from(part.inlineData.data, 'base64'))
    }
    throw new Error('no image in response')
  },
}
```

`src/lib/providers/higgsfield.ts` (endpoint/field names: verify against platform.higgsfield.ai docs during Step 5 smoke; adjust strings here only):
```ts
import { panelPrompt, type ImageProvider } from './types'

const BASE = 'https://platform.higgsfield.ai'
const headers = () => ({ 'hf-api-key': process.env.HF_API_KEY!, 'hf-secret': process.env.HF_SECRET!, 'content-type': 'application/json' })

export const higgsfieldProvider: ImageProvider = {
  name: 'higgsfield',
  async generatePanel(req) {
    const create = await fetch(`${BASE}/v1/text2image`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ params: { prompt: panelPrompt(req), width_and_height: '1024x1024', quality: 'basic' } }),
    })
    if (!create.ok) throw new Error(`higgsfield create ${create.status}`)
    const { id } = await create.json()
    for (let i = 0; i < 30; i++) {                                   // poll up to ~60s
      await new Promise(r => setTimeout(r, 2000))
      const poll = await fetch(`${BASE}/v1/job-sets/${id}`, { headers: headers() })
      const job = await poll.json()
      const done = (job.jobs ?? []).find((j: { status: string }) => j.status === 'completed')
      if (done?.results?.raw?.url) {
        const img = await fetch(done.results.raw.url)
        return new Uint8Array(await img.arrayBuffer())
      }
      if ((job.jobs ?? []).length && job.jobs.every((j: { status: string }) => j.status === 'failed')) throw new Error('higgsfield failed')
    }
    throw new Error('higgsfield timeout')
  },
}
```

`src/lib/providers/mock.ts`:
```ts
import type { ImageProvider } from './types'
// minimal valid 1x1 PNG — real bytes for upload paths in tests/E2E
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
export const mockProvider: ImageProvider = {
  name: 'mock',
  async generatePanel() { return Uint8Array.from(Buffer.from(PNG_B64, 'base64')) },
}
```

`src/lib/providers/index.ts`:
```ts
import type { ImageProvider } from './types'
import { geminiProvider } from './gemini'
import { higgsfieldProvider } from './higgsfield'
import { mockProvider } from './mock'
export { panelPrompt } from './types'
export type { ImageProvider, PanelRequest } from './types'

export function getProvider(): ImageProvider {
  switch (process.env.IMAGE_PROVIDER) {
    case 'higgsfield': return higgsfieldProvider
    case 'mock': return mockProvider
    default: return geminiProvider
  }
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Live smoke both real providers (manual)**

`scripts/smoke-provider.mjs`:
```js
// usage: IMAGE_PROVIDER=gemini GEMINI_API_KEY=... node --experimental-strip-types scripts/smoke-provider.mjs
// (or npx tsx scripts/smoke-provider.mjs)
const { getProvider } = await import('../src/lib/providers/index.ts')
const bytes = await getProvider().generatePanel({ arcWord: 'lonely', emotion: 'loneliness', intensity: 0.8, palette: ['#3a4468', '#6b729a', '#23283d'] })
const { writeFileSync } = await import('fs')
writeFileSync('/tmp/panel.png', bytes)
console.log('wrote /tmp/panel.png', bytes.byteLength, 'bytes')
```
Run once with `IMAGE_PROVIDER=gemini`, once with `IMAGE_PROVIDER=higgsfield`. Open `/tmp/panel.png` both times.
Expected: painterly abstract, palette respected, no text/faces. Fix higgsfield endpoint/field names here if their docs differ.

- [ ] **Step 6: Commit + journal line**

```bash
git add -A && git commit -m "feat: image provider abstraction — gemini default, higgsfield flag, mock"
```

---

### Task 7: `/api/paint`, `/api/kin`, `/api/light`

**Files:**
- Create: `app/api/paint/route.ts`, `app/api/kin/route.ts`, `app/api/light/route.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–6 (import paths: `@/lib/emotion`, `@/lib/extract`, `@/lib/providers`, `@/lib/ratelimit`, `@/lib/session`, `@/lib/supabase`).
- Produces route contracts (UI depends on exact shapes):
  - `POST /api/paint` body `{ beats: ArcBeat[] }` header `x-session-id` → `{ status:'ok', painting: PaintingRow & { mine:true } }` | `{ status:'limited'|'resting'|'rejected' }` | `{ status:'solo', painting }` (DB insert failed — local-only painting, spec §7).
  - `POST /api/kin` body `{ vec: number[], excludeId?: string }` → `{ kin: PaintingRow[] }` (top 4 cosine).
  - `POST /api/light` body `{ paintingId: string }` header `x-session-id` → `{ ok: boolean, lights?: number }` (idempotent per session+painting; 20/day/session cap).

- [ ] **Step 1: Implement `/api/paint`**

`app/api/paint/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { EMOTIONS, paletteFor, valence, arousal, type ArcBeat, type Emotion } from '@/lib/emotion'
import { blendVec } from '@/lib/extract'
import { getProvider } from '@/lib/providers'
import { checkLimits } from '@/lib/ratelimit'
import { sessionHash } from '@/lib/session'
import { serverDb } from '@/lib/supabase'

function sanitizeBeats(input: unknown): ArcBeat[] | null {
  if (!Array.isArray(input) || input.length !== 3) return null
  return input.map(b => ({
    word: String(b?.word ?? '').toLowerCase().slice(0, 24) || 'quiet',
    emotion: ((EMOTIONS as readonly string[]).includes(b?.emotion) ? b.emotion : 'calm') as Emotion,
    intensity: Math.min(1, Math.max(0, Number(b?.intensity) || 0.5)),
  }))
}

export async function POST(req: NextRequest) {
  const hash = sessionHash(req.headers.get('x-session-id') ?? 'anon')
  const body = await req.json().catch(() => ({}))
  const beats = sanitizeBeats(body.beats)
  if (!beats) return NextResponse.json({ status: 'rejected' })

  const db = serverDb()
  const limit = await checkLimits(db, hash).catch(() => 'ok' as const)
  if (limit !== 'ok') return NextResponse.json({ status: limit })

  const vec = blendVec(beats)                       // server recomputes — never trusts a client vector
  const palette = beats.map(b => paletteFor(b.emotion))
  const provider = getProvider()

  const panels = await Promise.allSettled(beats.map(b =>
    provider.generatePanel({ arcWord: b.word, emotion: b.emotion, intensity: b.intensity, palette: paletteFor(b.emotion) })))

  const urls: string[] = []
  for (const p of panels) {
    if (p.status === 'fulfilled') {
      const path = `${crypto.randomUUID()}.png`
      const up = await db.storage.from('panels').upload(path, p.value, { contentType: 'image/png' })
      urls.push(up.error ? '' : db.storage.from('panels').getPublicUrl(path).data.publicUrl)
    } else urls.push('')                            // '' => client renders ParticlePanel (spec §7)
  }

  const row = {
    arc_words: beats.map(b => b.word), emotion_vec: vec,
    valence: valence(vec), arousal: arousal(vec),
    panel_urls: urls, palette, session_hash: hash,
  }
  const ins = await db.from('paintings').insert(row).select().single()
  if (ins.error) return NextResponse.json({
    status: 'solo',
    painting: { ...row, id: 'local-' + Date.now(), lights: 0, is_seed: false, created_at: new Date().toISOString(), mine: true },
  })
  return NextResponse.json({ status: 'ok', painting: { ...ins.data, mine: true } })
}
```

- [ ] **Step 2: Implement `/api/kin`**

`app/api/kin/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { topKin } from '@/lib/emotion'
import { serverDb } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { vec, excludeId } = await req.json().catch(() => ({}))
  if (!Array.isArray(vec) || vec.length !== 8) return NextResponse.json({ kin: [] })
  const { data } = await serverDb().from('paintings').select('*').order('created_at', { ascending: false }).limit(500)
  const rows = (data ?? []).filter(r => r.id !== excludeId)
  return NextResponse.json({ kin: topKin(vec.map(Number), rows, 4) })
}
```

- [ ] **Step 3: Implement `/api/light`**

`app/api/light/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { sessionHash } from '@/lib/session'
import { serverDb } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const hash = sessionHash(req.headers.get('x-session-id') ?? 'anon')
  const { paintingId } = await req.json().catch(() => ({}))
  if (!paintingId) return NextResponse.json({ ok: false })
  const db = serverDb()
  const dayAgo = new Date(Date.now() - 86400_000).toISOString()
  const { count } = await db.from('lights_log').select('*', { count: 'exact', head: true }).eq('session_hash', hash).gte('created_at', dayAgo)
  if ((count ?? 0) >= 20) return NextResponse.json({ ok: false })
  const ins = await db.from('lights_log').insert({ painting_id: paintingId, session_hash: hash })
  if (ins.error) {                                   // duplicate PK = already lit → idempotent success
    const { data } = await db.from('paintings').select('lights').eq('id', paintingId).single()
    return NextResponse.json({ ok: true, lights: data?.lights ?? 0 })
  }
  const { data } = await db.rpc('increment_lights', { pid: paintingId })
  return NextResponse.json({ ok: true, lights: data ?? 0 })
}
```

- [ ] **Step 4: Manual verify (mock mode)**

`IMAGE_PROVIDER=mock MOCK_AI=1 npm run dev`, then:
- paint: `curl -s localhost:3000/api/paint -H 'content-type: application/json' -H 'x-session-id: t1' -d '{"beats":[{"word":"anxious","emotion":"fear","intensity":0.7},{"word":"lifted","emotion":"joy","intensity":0.6},{"word":"lonely","emotion":"loneliness","intensity":0.8}]}'` → `status:"ok"`, painting with 3 non-empty `panel_urls`, sane valence/arousal.
- 4th paint same session within hour → `status:"limited"`.
- kin: post the returned `emotion_vec` → 4 rows.
- light twice same painting+session → second response same `lights` count.

- [ ] **Step 5: Commit + journal line**

```bash
git add -A && git commit -m "feat: paint/kin/light APIs — parallel panels, particle fallback markers, idempotent lights"
```

---

### Task 8: 2D flow UI — JournalScreen, ArcConfirm, phase machine

**Files:**
- Create: `src/components/JournalScreen.tsx`, `src/components/ArcConfirm.tsx`
- Modify: `app/page.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `/api/journal` + `/api/paint` contracts, `getSessionId`.
- Produces props contracts (Task 9/11 slot into this machine):
  - `<JournalScreen onArc={(beats: ArcBeat[], rawText: string) => void} onCrisis={() => void} onResting={() => void} />`
  - `<ArcConfirm beats={ArcBeat[]} onConfirm={(edited: ArcBeat[]) => void} />`
  - `app/page.tsx` phases: `'journal' | 'confirm' | 'dissolve' | 'reveal' | 'museum' | 'crisis' | 'resting'`; on confirm it immediately fires `/api/paint` and stores the promise; dissolve phase completes when promise settles AND min-time elapsed.

- [ ] **Step 1: Implement JournalScreen**

`src/components/JournalScreen.tsx`:
```tsx
'use client'
import { useState } from 'react'
import type { ArcBeat } from '@/lib/emotion'
import { getSessionId } from '@/lib/session'

export default function JournalScreen({ onArc, onCrisis, onResting }: {
  onArc: (beats: ArcBeat[], rawText: string) => void; onCrisis: () => void; onResting: () => void
}) {
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [gentle, setGentle] = useState('')
  async function submit() {
    if (text.trim().length < 3 || busy) return
    setBusy(true)
    const res = await fetch('/api/journal', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': getSessionId() },
      body: JSON.stringify({ text }),
    }).then(r => r.json()).catch(() => null)
    setBusy(false)
    if (!res) return setGentle('the museum is far away tonight — try once more?')
    if (res.status === 'crisis') return onCrisis()
    if (res.status === 'resting') return onResting()
    if (res.status === 'limited') return setGentle('the museum asks you to rest a while — come back in an hour')
    if (res.status === 'rejected') return setGentle("the museum couldn't hear that — try again?")
    onArc(res.beats, text)
  }
  return (
    <section style={{ maxWidth: 560, margin: '18vh auto 0', padding: '0 1.2rem' }}>
      <h1 style={{ fontWeight: 400, marginBottom: '1.4rem' }}>how was your day, really?</h1>
      <textarea value={text} onChange={e => setText(e.target.value.slice(0, 600))} rows={6} autoFocus
        style={{ width: '100%', background: 'transparent', color: 'var(--ink)', border: '1px solid #2a2822', padding: '1rem', font: 'inherit', fontSize: '1.05rem' }}
        placeholder="no one will read this. not even us." />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.9rem', alignItems: 'center' }}>
        <span className="plaque">{gentle || `${text.length}/600`}</span>
        <button onClick={submit} disabled={busy || text.trim().length < 3}
          style={{ background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '.55rem 1.4rem' }}>
          {busy ? 'listening…' : 'let it go'}
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Implement ArcConfirm**

`src/components/ArcConfirm.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { EMOTIONS, type ArcBeat, type Emotion, paletteFor } from '@/lib/emotion'

export default function ArcConfirm({ beats, onConfirm }: { beats: ArcBeat[]; onConfirm: (b: ArcBeat[]) => void }) {
  const [edit, setEdit] = useState<ArcBeat[]>(beats)
  const set = (i: number, emotion: Emotion) => setEdit(e => e.map((b, j) => (j === i ? { ...b, emotion } : b)))
  return (
    <section style={{ maxWidth: 560, margin: '22vh auto 0', padding: '0 1.2rem', textAlign: 'center' }}>
      <p className="plaque" style={{ marginBottom: '1.6rem' }}>we heard:</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {edit.map((b, i) => (
          <label key={i} style={{ display: 'grid', gap: '.4rem' }}>
            <span style={{ fontSize: '1.3rem', color: paletteFor(b.emotion)[0] }}>{b.word}</span>
            <select value={b.emotion} onChange={e => set(i, e.target.value as Emotion)}
              style={{ background: 'var(--bg)', color: 'var(--dim)', border: '1px solid #2a2822', padding: '.3rem' }}>
              {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
        ))}
      </div>
      <button onClick={() => onConfirm(edit)}
        style={{ marginTop: '2.2rem', background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '.55rem 1.6rem' }}>
        yes, that was my day
      </button>
    </section>
  )
}
```

- [ ] **Step 3: Phase machine in `app/page.tsx`**

`'use client'` component. State: `phase`, `beats`, `rawText`, `painting`, `paintPromise`. Transitions: journal→(onArc)→confirm→(onConfirm: fire fetch `/api/paint`, keep promise, phase dissolve)→dissolve (Task 9 component; until Task 9 exists render `<p className="plaque">the paint is drying…</p>` and await promise)→reveal (until Task 9: plain `<img>` row or ParticlePanel)→museum (until Task 10: link to `/museum`). Crisis phase: inline `ResourceCard` — soft copy ("you matter · you are not alone"), links: iCall +91 9152987821, AASRA +91 98204 66726, findahelpline.com. Resting phase: "the museum is resting tonight — walk the halls instead" + `/museum` link. Paint response `status:'limited'|'resting'` during dissolve → route to those phases (no error UI ever).

- [ ] **Step 4: Manual verify**

`IMAGE_PROVIDER=mock MOCK_AI=1 npm run dev`: happy path journal→confirm→drying→reveal placeholder; `MOCKCRISIS` → resource card; no console errors; mobile viewport sane.

- [ ] **Step 5: Commit + journal line**

```bash
git add -A && git commit -m "feat: journey phase machine — journal, arc confirm, crisis card, resting"
```

---

### Task 9: DissolveCanvas + TriptychReveal + ParticlePanel

**Files:**
- Create: `src/components/ParticlePanel.tsx`, `src/components/DissolveCanvas.tsx`, `src/components/TriptychReveal.tsx`
- Modify: `app/page.tsx` (wire real components into dissolve/reveal phases)

**Interfaces:**
- Consumes: `paletteFor`, painting row shape from `/api/paint`.
- Produces:
  - `<ParticlePanel palette={string[]} arousal={number} seed={number} size?={number} />` — deterministic canvas painting (same seed → identical output; also reused as museum texture + E2E-visible fallback).
  - `<DissolveCanvas text={string} beats={ArcBeat[]} minMs={8000} done={boolean} onFinished={() => void} />` — letters detach → emotion-tinted particles → drift into 3 panel silhouettes; finishes when `elapsed ≥ minMs && done`.
  - `<TriptychReveal painting onEnterMuseum={() => void} />` — staggered panel fade; `panel_urls[i] === ''` → ParticlePanel with `palette[i]`, `arousal`, seed = i + hash of id.

- [ ] **Step 1: Implement ParticlePanel**

`src/components/ParticlePanel.tsx`:
```tsx
'use client'
import { useEffect, useRef } from 'react'

function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

export default function ParticlePanel({ palette, arousal, seed = 1, size = 512 }: { palette: string[]; arousal: number; seed?: number; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!; const rnd = mulberry32(seed)
    ctx.fillStyle = '#12100d'; ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 600; i++) {
      ctx.strokeStyle = palette[Math.floor(rnd() * palette.length)] + '55'
      ctx.lineWidth = 1 + rnd() * 6
      const x = rnd() * size, y = rnd() * size, len = 20 + rnd() * 80
      const ang = rnd() * Math.PI * 2 * (0.2 + arousal)
      ctx.beginPath(); ctx.moveTo(x, y)
      ctx.quadraticCurveTo(
        x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5 + (rnd() - 0.5) * 40 * arousal,
        x + Math.cos(ang) * len, y + Math.sin(ang) * len)
      ctx.stroke()
    }
  }, [palette, arousal, seed, size])
  return <canvas ref={ref} width={size} height={size} style={{ width: '100%', height: '100%', display: 'block' }} />
}
```

- [ ] **Step 2: Implement DissolveCanvas**

Full-viewport `<canvas>`; on mount: measure-wrap `text` into lines (ctx.measureText, ~34ch), draw once to capture per-letter positions; build particles `{x, y, vx:0, vy:0, char, color}` where color = `paletteFor(beats[Math.floor(3 * idx / total)].emotion)[0]`; three target rects (panel silhouettes) centered lower third. rAF loop: for first 1.5s render letters static; then each letter (staggered by index) switches to particle — steering vector toward its panel rect + per-frame jitter, alpha fades from text-ink to color; when inside rect, orbit slowly. Track `elapsed`; when `elapsed >= minMs && props.done`, ease all particles' alpha to 0 over 600ms then call `onFinished()` once. `prefers-reduced-motion`: skip particles, show "the paint is drying…" plaque and call `onFinished` on same condition. ~130 lines, no external lib.

- [ ] **Step 3: Implement TriptychReveal**

```tsx
'use client'
import ParticlePanel from './ParticlePanel'

function seedFrom(id: string, i: number) { let h = i + 1; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }

export default function TriptychReveal({ painting, onEnterMuseum }: { painting: any; onEnterMuseum: () => void }) {
  return (
    <section style={{ maxWidth: 900, margin: '10vh auto 0', padding: '0 1.2rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {[0, 1, 2].map(i => (
          <figure key={i} style={{ width: 'min(260px, 80vw)', animation: `fadeIn .8s ease ${i * 0.8}s both` }}>
            <div style={{ aspectRatio: '1', border: '10px solid #2a241c', background: '#12100d' }}>
              {painting.panel_urls[i]
                ? <img src={painting.panel_urls[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <ParticlePanel palette={painting.palette[i]} arousal={painting.arousal} seed={seedFrom(String(painting.id), i)} />}
            </div>
            <figcaption className="plaque" style={{ marginTop: '.5rem' }}>{painting.arc_words[i]}</figcaption>
          </figure>
        ))}
      </div>
      <button onClick={onEnterMuseum}
        style={{ marginTop: '2.4rem', background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '.6rem 1.8rem' }}>
        hang it in the museum
      </button>
    </section>
  )
}
```
Add to `globals.css`: `@keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1 } }`

- [ ] **Step 4: Manual verify**

Mock mode: dissolve runs ≥8s at 60fps, letters visibly become colored particles flowing into three shapes; reveal staggers; devtools offline → paint fails → reveal shows 3 ParticlePanels — flow identical, zero error surfaces.

- [ ] **Step 5: Commit + journal line**

```bash
git add -A && git commit -m "feat: words-dissolve animation, staggered triptych reveal, deterministic particle fallback"
```

---

### Task 10: 3D museum — scene, room, frames, rails camera

**Files:**
- Create: `src/components/museum/MuseumScene.tsx`, `GalleryRoom.tsx`, `PaintingFrame.tsx`, `RailsCamera.tsx`, `app/museum/page.tsx`

**Interfaces:**
- Consumes: `browserDb()` anon read, `wallPosition`, painting row shape, ParticlePanel drawing approach (offscreen canvas → `CanvasTexture`).
- Produces:
  - `<MuseumScene highlightId?: string />` — self-contained: fetches paintings, subscribes Realtime, renders room. `highlightId` = just-hung painting; camera starts before it.
  - Internal focus flow: `GalleryRoom` holds `focus: painting | null`; clicking a frame sets it; `RailsCamera` receives `focusTarget: {x,y,z} | null`.

- [ ] **Step 1: MuseumScene** — `<Canvas dpr={[1, 1.5]} camera={{ position: [0, 1.6, 4], fov: 50 }}>`, `<fog attach="fog" args={['#0e0d0b', 6, 18]} />`, `<ambientLight intensity={0.15} />`, floor plane (`#14120f`, roughness .85), `<Suspense fallback={null}><GalleryRoom highlightId={highlightId} /></Suspense>`.

- [ ] **Step 2: GalleryRoom** — on mount: `browserDb().from('paintings').select('*').order('created_at', { ascending: false }).limit(120)`; position via `wallPosition(p.valence, p.arousal, seedFrom(p.id, 0))`; render `<PaintingFrame>` per row + warm `<spotLight>` aimed at each (drei `SpotLight` intensity 2, angle 0.35, penumbra .6). Realtime channel: INSERT → prepend row (bloom-in scale animation via spring/lerp on mount), UPDATE → patch `lights`. Cap displayed at 120 latest.

- [ ] **Step 3: PaintingFrame** — group at position: frame `<mesh>` boxes (#2a241c), three 0.5×0.5 planes side by side; texture: `panel_urls[i]` ? `useLoader(THREE.TextureLoader, url)` : `CanvasTexture` from offscreen ParticlePanel-drawing (extract the drawing loop from ParticlePanel into shared `drawParticlePainting(ctx, palette, arousal, seed, size)` helper in `src/components/particle-draw.ts`, used by both). Plaque: drei `<Text fontSize={0.045} color="#8d8578">`: `arc_words.join(' · ')` + time (`toLocaleTimeString [], {hour:'2-digit', minute:'2-digit'}`); `is_seed` → prefix `founding collection · `. Lights: `Math.min(lights, 12)` tiny emissive spheres along frame bottom. `onClick` → focus.

- [ ] **Step 4: RailsCamera** — `useFrame`: lerp `camera.position` toward `standPoint` (0.06), `camera.lookAt` lerped focus point. Focus painting → standPoint = 1.4m in front of its frame. Wheel deltaY / horizontal touch-drag → `standPoint.x` clamped [-7, 7] (glide along wall, lookAt wall). ESC key or lobby button (drei `<Html>`) → `[0, 1.6, 4]` looking at mural end. No orbit, no pointer-lock.

- [ ] **Step 5: `app/museum/page.tsx`** — `'use client'`; full-viewport MuseumScene; overlay links (plain positioned divs): "← tell the museum about your day" → `/`, "about" → `/about`.

- [ ] **Step 6: Manual verify** — seed ~6 paintings via curl loop (mock mode) with varied emotions; check: sad hangs left/low, joy right/higher; click dollies smoothly; 60fps desktop; second browser tab paints → painting blooms in live; phone: swipe glides.

- [ ] **Step 7: Commit + journal line**

```bash
git add -A && git commit -m "feat: 3D night museum — gallery room, plaqued frames, rails camera, realtime growth"
```

---

### Task 11: MuralWall + leave-a-light + MuseumTransition

**Files:**
- Create: `src/components/museum/MuralWall.tsx`
- Modify: `src/components/museum/PaintingFrame.tsx` (light button), `src/components/museum/GalleryRoom.tsx` (mount mural), `app/page.tsx` (reveal→museum transition)

**Interfaces:**
- Consumes: paintings array (last 40), `/api/light` contract, `getSessionId`.
- Produces: `<MuralWall paintings />` on lobby end wall (z = +5 behind camera start, or side wall x = -7.5); light action visible only when focused frame distance < 2.

- [ ] **Step 1: MuralWall** — drei `<Points>` (or instanced small planes) spanning 8×3m: per painting spawn 80 points in a horizontal band region (band x-center from painting valence), color = `palette[1][0]` (mid panel dominant hex), size 0.02 + arousal*0.04, `useFrame` sine drift (phase = index). New Realtime painting → its points scale-in over ~2s. This renders the "aggregate emotion field" without shaders.

- [ ] **Step 2: Leave-a-light in PaintingFrame** — when this frame is the current focus: drei `<Html center distanceFactor={2}>` button "leave a light" → POST `/api/light` (session header) → optimistic sphere +1; response `ok:false` or repeat → button label "a light is yours here" (disable). Never show failure text.

- [ ] **Step 3: MuseumTransition in `app/page.tsx`** — reveal→museum: mount `<MuseumScene highlightId={painting.id} />` behind reveal at opacity 0; CSS 1.8s: triptych scales to 0.18 translating toward viewport center while museum fades to 1; then unmount reveal. `prefers-reduced-motion` → 400ms crossfade. `status:'solo'` painting (no DB id): skip museum hang, show museum browse + plaque line "your painting lives on this device tonight".

- [ ] **Step 4: Manual verify** — mural drifts; new painting from second tab blooms into mural + wall; light persists across reload; same-session relight doesn't increment; transition smooth on phone viewport; reduced-motion setting → crossfade.

- [ ] **Step 5: Commit + journal line**

```bash
git add -A && git commit -m "feat: mural wall, leave-a-light ritual, reveal→museum transition"
```

---

### Task 12: Fallbacks, /about, resting banner, mic, mobile pass

**Files:**
- Create: `src/components/museum/FlatGallery.tsx`, `app/about/page.tsx`, `src/lib/webgl.ts`
- Modify: `app/museum/page.tsx` + `app/page.tsx` (detection wiring), `src/components/JournalScreen.tsx` (mic)

**Interfaces:**
- Produces: `hasWebGL(): boolean` (`!!document.createElement('canvas').getContext('webgl2') || …('webgl')`); `<FlatGallery paintings />` — CSS grid sorted by valence, triptych cards with plaques + ✦ light counts, scroll parallax via `transform: translateY(calc(var(--offset) * -0.05px))` per column. Wired everywhere MuseumScene mounts: `hasWebGL() ? <MuseumScene/> : <FlatGallery/>`.

- [ ] **Step 1: webgl.ts + FlatGallery + wiring.** Manual verify: force-fail detection (return false) → flat gallery renders all paintings, plaques intact, no 3D imports crash.
- [ ] **Step 2: `/about`** — three short serif sections: (1) thesis — technology blamed for loneliness, inverted here; (2) how it works + privacy: "your words are analyzed in memory and never stored — the database has no column for them"; crisis policy sentence; (3) "founding collection" disclosure + credits + GitHub link.
- [ ] **Step 3: Resting banner** — journal phase checks nothing extra (API already returns `resting`); ensure resting phase copy: "the museum is resting tonight — walk the halls instead" + `/museum` link. Verify by setting `DAILY_PAINTING_CAP=0` locally.
- [ ] **Step 4: Mic input** — `const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition`; if absent hide button. Toggle: start/stop, `interimResults=false`, append final transcripts to textarea (respect 600 cap).
- [ ] **Step 5: Mobile pass** — journal/confirm thumb-reachable; museum touch glide; `<Canvas dpr={[1, 1.5]}>` confirmed; Lighthouse mobile perf ≥ 70 on `/museum` with 30 paintings.
- [ ] **Step 6: Commit + journal line**

```bash
git add -A && git commit -m "feat: flat-gallery fallback, about page, resting mode copy, mic input, mobile pass"
```

---

### Task 13: Seed script + E2E + manual checklist

**Files:**
- Create: `scripts/seed-entries.json`, `scripts/seed.mjs`, `playwright.config.ts`, `e2e/journey.spec.ts`

**Interfaces:**
- Consumes: running app; real APIs for prod seeding; mock mode for E2E.
- Produces: 15 founding-collection paintings in prod; green E2E gate.

- [ ] **Step 1: seed-entries.json** — builder writes 15 REAL short entries about own days (varied coverage: joyful, sad, lonely, angry, calm, mixed). These are honest disclosed seeds (`is_seed=true` → "founding collection ·" plaque), NOT synthetic strangers — council hard requirement.

- [ ] **Step 2: seed.mjs**

```js
// usage: node scripts/seed.mjs https://your-app.vercel.app
// env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (to flip is_seed)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const base = process.argv[2] ?? 'http://localhost:3000'
const entries = JSON.parse(readFileSync('scripts/seed-entries.json', 'utf8'))
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
for (const [i, text] of entries.entries()) {
  const sid = 'seed-' + i
  const j = await fetch(base + '/api/journal', { method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': sid }, body: JSON.stringify({ text }) }).then(r => r.json())
  if (j.status !== 'ok') { console.log(i, 'skipped:', j.status); continue }
  const p = await fetch(base + '/api/paint', { method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': sid }, body: JSON.stringify({ beats: j.beats }) }).then(r => r.json())
  if (p.status === 'ok') { await db.from('paintings').update({ is_seed: true }).eq('id', p.painting.id); console.log(i, 'hung', p.painting.id) }
  else console.log(i, 'paint failed:', p.status)
  await new Promise(r => setTimeout(r, 1500))
}
```
Note: seeding 15 > 3/hour rate limit — uses distinct session ids per entry (above) so limits don't bite; global cap unaffected.

- [ ] **Step 3: playwright.config.ts**

```ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: { command: 'IMAGE_PROVIDER=mock MOCK_AI=1 npm run dev', port: 3000, reuseExistingServer: true },
})
```

- [ ] **Step 4: e2e/journey.spec.ts**

```ts
import { test, expect } from '@playwright/test'

test('journal → confirm → painting hangs → museum', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder(/no one will read/).fill('rough morning, warm lunch with a friend, quiet lonely night')
  await page.getByRole('button', { name: 'let it go' }).click()
  await expect(page.getByText('we heard:')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'yes, that was my day' }).click()
  await expect(page.getByRole('button', { name: /hang it in the museum/ })).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: /hang it in the museum/ }).click()
  await expect(page.locator('canvas').first()).toBeVisible()
})

test('crisis entry → resource card, no painting', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder(/no one will read/).fill('MOCKCRISIS')
  await page.getByRole('button', { name: 'let it go' }).click()
  await expect(page.getByText(/not alone/i)).toBeVisible()
})
```

- [ ] **Step 5: Run** `npx playwright test` → 2 green. Manual device checklist (record results as JOURNAL.md entries): iPhone Safari full journey; Android Chrome if available; laptop Chrome + Firefox; throttled 3G dissolve→reveal.

- [ ] **Step 6: Commit + journal line**

```bash
git add -A && git commit -m "test: e2e journey + crisis path, founding-collection seed script"
```

---

### Task 14: Deploy, README, demo assets, submission

**Files:**
- Modify: `README.md` (judge-facing rewrite)
- Create: `LICENSE` (MIT), `docs/demo/` assets

- [ ] **Step 1: Deploy** — GitHub public repo push; Vercel import; env vars set (`IMAGE_PROVIDER=gemini`, all keys, `SESSION_SALT` random); prod journey verified end-to-end. RLS check: `curl` an insert to Supabase REST with anon key → expect 401/403 (no write policy).
- [ ] **Step 2: Seed prod** — `node scripts/seed.mjs https://<prod-url>` → 15 founding paintings visible in prod museum.
- [ ] **Step 3: Demo assets** — locally `IMAGE_PROVIDER=higgsfield`: record (a) 15s museum-pan GIF (README hero), (b) 2-min video: cold-open line ("Technology gets blamed for making us lonely…") → journal → dissolve → reveal → kin adjacency in museum → light a stranger's painting → mural → about/privacy beat. Store links/files in `docs/demo/`.
- [ ] **Step 4: README rewrite** — order: hero GIF → one-paragraph thesis → "Visit the museum" prod link (magic <60s) → 2-min video link → how it works (flow diagram in text + schema privacy note "there is no column for your words") → safety (crisis card, founding-collection disclosure, rate limits) → local setup via `.env.example` → stack → license. Keep JOURNAL.md pointer (process history = part of the hackathon story).
- [ ] **Step 5: Final gate** — `npm test` green, `npx playwright test` green, `npm run build` clean, prod smoke once more. `git tag submission-v1 && git push --tags`. JOURNAL.md: Decision Log "SUBMITTED" entry + final Edit Log lines.

---

## Self-review (performed at write time; issues fixed inline)

1. **Spec coverage:** spec §1 concept/flow → T8–T11; §2 locked decisions → T1 (env/stack), T6 (dual provider); §3 architecture/routes → T5, T7; §4 schema → T3 (+is_seed, lights_log, increment_lights needed by §5/§6 features); §5 components/routes → T8–T12; §6 safety → T4 (classification), T5 (statuses), T7 (caps, idempotent lights), T8 (crisis card); §7 no-error-screens → T5 keyword fallback, T7 ''-panels + solo status, T9 ParticlePanel, T12 FlatGallery + resting copy; §8 testing → T2/3/4/5/6 unit+curl, T13 E2E/manual/seed; §9 build priority ≈ task order with cut line after T11; §10 deliverables → T14. Name TBD intentionally carried (working title "Emotion Museum" in metadata only).
2. **Placeholder scan:** clean — the two "verify against docs" notes (Higgsfield endpoint fields, Gemini image model id) are live-smoke verification steps with concrete code present, not TBDs.
3. **Type consistency:** `EMOTIONS` order, `ArcBeat`, `EmotionVec`, `panel_urls ''` convention, `sessionHash`/`getSessionId`, route response unions, `topKin` in `@/lib/emotion`, `panelPrompt` in `providers/types.ts` (cycle-free) — cross-checked task to task.
