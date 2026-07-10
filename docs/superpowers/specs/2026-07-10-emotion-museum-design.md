# Emotion Museum (working name — final name TBD) — Design Spec

**Date:** 2026-07-10
**Hackathon theme:** "Create art that couldn't exist without technology."
**Builder:** solo, 1–2 week runway. **Judging:** async via GitHub repo + hosted link.
**Status:** Design approved by user 2026-07-10. History: ../../../JOURNAL.md (council review + all decisions).

## 1. Concept

An anonymous emotional-kinship artwork. Visitors journal about their day; an AI extracts the day's emotional arc; the arc becomes a triptych painting; the painting hangs in a shared 3D night-museum beside paintings of strangers who felt the same. No accounts, no likes, no text ever shown or stored — connection through color alone. The museum grows with every visitor, including every judge who tries it.

**Core moment:** journal words visibly dissolve into pigment as the painting forms (deletion performed, not claimed) → camera flies into the museum → your painting glides onto the wall beside your emotional kin.

## 2. Locked decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Form factor | Hybrid: 2D journal flow → 3D museum on rails (R3F), one room + lobby mural wall | Spectacle of 3D, usability of 2D; 2D CSS gallery-wall fallback if 3D slips |
| Architecture | Server-centric Next.js monolith (Approach A) | All safety at one choke point; keys server-side; clean repo for judges |
| Stack | Next.js + React + React Three Fiber, Supabase (Postgres/Storage/Realtime), Vercel | Solo-friendly, one deploy, free tiers |
| Image gen | Dual backend behind `ImageProvider` interface: Gemini (default, hosted/public) + Higgsfield (env flag, private demo-video recording) | Free tier absorbs public use; best quality where judges look first (video/GIFs) |
| Emotion extraction | Gemini (same key as default image backend) | One provider, free tier |
| Song mode | CUT as live feature (council, unanimous) | Stroke-replay idea survives in dissolve/arc animation |
| Kin corpus | Real entries only + ~15 disclosed seed entries ("founding collection" plaques) | Council hard requirement: no fake strangers |
| Privacy claim | "We never store your words" — enforced by schema (no text column exists) | "Words deleted" was falsifiable; this is provable |
| Name | TBD. Candidates: Felt, Undertone, Same Blue, Wavelength, Tinge. "Sonder" rejected (existing app, same category) | Trademark collision |

## 3. Architecture

```
Browser ──► Next.js (Vercel) ──► Supabase (free tier)
2D flow      /api/journal          Postgres: paintings
3D museum    /api/paint            Storage: panel images
(R3F rails)  /api/kin              Realtime: live inserts → museums update
             /api/light
```

- `/api/journal` — POST text → Gemini: 3-beat emotional arc + 8-dim emotion vector + crisis/abuse classification. Text held in RAM only; response returns arc; text never persisted or logged.
- `/api/paint` — POST confirmed arc → 3 panel generations in parallel via `ImageProvider` → Supabase Storage → insert `paintings` row → Realtime broadcast.
- `/api/kin` — GET emotion vector → cosine similarity in SQL over corpus → top 4 kin paintings.
- `/api/light` — POST anonymous glow (+1 light) on a painting; rate-limited per session-hash.

`ImageProvider` interface: `generatePanel(emotion, palette, style) → imageBytes`. Implementations: `providers/gemini.ts`, `providers/higgsfield.ts`. Selection: `IMAGE_PROVIDER` env var. Style prompts enforce painterly constraints (impasto/gouache texture, canvas grain, limited palette) — AI as pigment, not painter: composition (triptych layout, per-beat palette) is deterministic code.

## 4. Data model

```sql
paintings (
  id            uuid primary key,
  created_at    timestamptz,
  arc_words     text[3],        -- e.g. "anxious","lifted","lonely" — plaque text
  emotion_vec   float8[8],      -- joy,sadness,anger,fear,calm,anticipation,loneliness,love ∈ [0,1]
  valence       float,          -- derived; museum x-placement
  arousal       float,          -- derived; museum height placement
  panel_urls    text[3],
  palette       jsonb,          -- per-beat hexes ASSIGNED at composition time (deterministic emotion→palette map, input to gen prompt); drives palette-echo animation
  lights        int default 0,
  is_seed       boolean default false,  -- founding-collection entries, disclosed on plaque
  session_hash  text            -- salted anon hash: own-painting recognition + rate limiting
)
```

No users table. No auth. No journal-text column — storing words is impossible by schema.
Kin matching: plain-SQL cosine over `emotion_vec` (corpus is hundreds of rows; pgvector unnecessary now, drop-in later).

## 5. Routes & components

Routes: `/` (full journey), `/museum` (browse-only entry, ambient mode), `/about` (thesis, privacy, credits).

2D flow: `JournalScreen` (textarea + Web Speech mic, ~600 chars) → `ArcConfirm` (3 tappable emotion chips, editable from 8 base emotions) → `DissolveCanvas` (letters detach, tint per-beat color, drift into 3 panel silhouettes; runs 8–12s = covers generation latency; IS the loading state) → `TriptychReveal` (panels fade left→right, serif plaques) → `MuseumTransition` (triptych shrinks, R3F scene fades in, painting glides to wall).

Museum (R3F, one component per file): `MuseumScene` (night lighting, fog), `GalleryRoom` (paintings positioned valence×arousal — kin hang adjacently), `PaintingFrame` (frame + texture + plaque: arc words + time, never names + light-glow bulbs), `MuralWall` (lobby; aggregate emotion field, shader/particle texture, Realtime-updated), `RailsCamera` (click painting → dolly; scroll/swipe glide; ESC → lobby; zero free-walk), `LightButton` (near-dolly only, 1/session/painting).

Realtime: museum subscribes to inserts + light updates — museum visibly grows while judges watch.
Mobile: 2D flow mobile-first; museum swipe-to-glide, DPR capped.

## 6. Safety (all at `/api/journal` choke point)

- **Crisis:** classification in the extraction pass. On self-harm signal → no painting, no kin-wall, no corpus entry → gentle resource card (helplines, soft copy). Non-negotiable.
- **Abuse:** hate/slurs/spam flagged same pass → generic rejection ("the museum couldn't hear that — try again?").
- **Rate limits:** 3 paintings/hour, 20 lights/day (session-hash + IP). Global daily budget cap → "museum is resting" browse-only mode with honest banner.

## 7. Error handling — no error screens, ever

Every failure resolves to something beautiful:

| Failure | Resolution |
|---------|-----------|
| Arc extraction timeout | 1 retry → client-side keyword→emotion fallback map; flow continues |
| 1–2 panels fail | Failed panel = particle-painting (p5 texture from beat emotion color + arousal turbulence) — reads as intentional style |
| All gen fails / quota exhausted | Full particle triptych; still hangs in museum; corpus grows with image API down |
| Supabase down | Solo mode: local painting, "the museum is unreachable — your painting lives on this device tonight" |
| No/weak WebGL | Auto 2D CSS parallax gallery wall (same data, flat display) |

## 8. Testing

- **Unit:** vector math (cosine kin, valence/arousal derivation), `ImageProvider` mocks (both backends), rate limiter.
- **Integration:** `/api/journal` canned entries — happy, crisis, abusive, gibberish.
- **E2E (Playwright, 1 spec):** journal → confirm → painting → museum hang → leave a light. Against preview deploy.
- **Manual:** iPhone Safari, low-end Android, laptop Chrome.
- **Seed script:** ~15 real entries by builder, `is_seed=true`, plaques disclose "founding collection".

## 9. Build priority (cut order = reverse)

1. Journal → arc → triptych pipeline (core)
2. Kin matching + museum room + rails camera (soul)
3. Dissolve animation + museum transition (money shot)
4. Mural wall + Realtime growth + leave-a-light
5. Polish: palette-echo, ambient mode, /about, seed collection
6. README GIFs + 2-min demo video (Higgsfield backend) — mandatory, not optional
7. (stretch) constellation kin view, timeline scrubber, poster export

## 10. Deliverables for judges

Public GitHub repo (MIT, `.env.example`, clean commits) + hosted Vercel link (magic <60s from README) + README with museum GIF at top + 2-min demo video + /about page carrying the thesis.
