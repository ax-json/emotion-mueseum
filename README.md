# Museum of Days

> *Technology gets blamed for making us lonely. We used it to let strangers find each other through feelings, not faces.*

**Live: [museum-of-days.vercel.app](https://museum-of-days.vercel.app)** — the whole journey takes under a minute: write three honest lines about your day, watch them become paint, then walk a night-museum where your evening hangs beside strangers who felt the same.

Tell the museum about your day. ChatGPT reads the emotional arc — three plain words you can correct with one tap — and writes the prompt for one canvas painted from your evening, while your words visibly dissolve into the pigment. The painting hangs in a walkable 3D museum **beside your emotional kin**, matched on an 8-dimension emotion fingerprint, never on text. You can leave an anonymous light under a stranger's painting. And every visitor's feelings feed one communal mural — *the world tonight* — that repaints itself each time a new entry arrives, so tonight's mural has never existed before and will never exist again.

## How it works

```
you write (or speak) 3 honest lines
        │  read in memory — never stored, never logged
        ▼
ChatGPT names the arc: "anxious · lifted · lonely"   ← one tap to correct
        │
        ▼
ChatGPT writes a glitch-collage prompt from your diary (never quoting it)
one canvas painted from your evening — Pollinations (free) / Higgsfield / Together / Gemini
your words dissolve into the pigment while the paint dries
        │
        ▼
3D night-museum: valence → where you hang along the wall, arousal → how high
your emotional kin (cosine similarity over ℝ⁸) hang beside you
        │
        ▼
leave a light · the communal mural repaints from the mean of every evening
```

**There is no column for your words.** The database stores only: three feeling-words, an 8-float emotion vector, valence/arousal, one panel URL, and a salted session hash. Nothing else exists to leak. The crafted painting prompt is checked before use — if it echoes four consecutive words of your diary, it is discarded for a deterministic local builder.

## The living mural

One `paintings` row wears the sentinel session `community`. When a new entry hangs, clients nudge `/api/community` fire-and-forget; the server repaints only if a visitor painting is newer than the mural — an **atomic conditional claim** on `created_at` means exactly one concurrent caller wins, an idle curl loop never triggers a paid generation, and a failed generation leaves the previous mural hanging. ChatGPT writes the mural prompt from the museum's mean emotion vector in the same house style; a deterministic builder is the fallback so the repaint never depends on a second AI call.

## The house style

Every canvas belongs to one school: dark analogue glitch-collage — torn paper, halftone photocopy fragments, pixel-sorting, datamosh smears, one loud chromatic accent on a near-black ground. Feelings are never named in an image prompt (models paint "anxious" as a face wearing anxiety); they become corruption behaviour and composition instead. No readable text, no recognizable faces — human presence only as statue fragments and silhouettes. The writer's actual words live on the plaque.

## Fail like a museum, not like an app

- **No error screens** — every failure resolves to art. Painting generation fails → your canvas stays a private particle painting on your device; it is never hung as an empty frame. Database down → your painting lives on your device tonight. Daily cap hit → "the museum is resting."
- **Crisis handling** — entries signaling self-harm swap the painting flow for a gentle helpline card (iCall, AASRA, findahelpline.com). Non-negotiable, server-side.
- **No fake strangers** — the first paintings are the builder's own days, plaqued "founding collection". Every kin match is a real entry.
- **Rate limits** — 3 paintings/hour per session, global daily cap, abuse classified server-side and quietly declined.
- **AI fallback chain** — ChatGPT reading → keyword reading; ChatGPT prompt → deterministic arc builder; image provider → particle art. A dead API can degrade the museum but never crash it.

## Run it locally

```bash
npm install
cp .env.example .env.local        # fill in your keys
npm run dev                       # http://localhost:3000
```

| Variable | Role |
|---|---|
| `OPENAI_API_KEY` | the professional reading + painting/mural prompts (ChatGPT); missing → keyword reading + local prompt builder |
| `OPENAI_MODEL` | optional, default `gpt-4o-mini` |
| `IMAGE_PROVIDER` | `pollinations` (free, keyless — the default in prod) \| `higgsfield` \| `together` \| `gemini` \| `mock` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only writes |
| `SESSION_SALT` | any long random string — session ids are stored only as salted hashes |
| `GEMINI_API_KEY` | only if `IMAGE_PROVIDER=gemini` |
| `DAILY_PAINTING_CAP` | optional, default 150 |

Supabase setup: run `supabase/schema.sql`, create a public storage bucket `panels`, enable Realtime on `paintings`.

Zero-key mode: `MOCK_AI=1 IMAGE_PROVIDER=mock npm run dev` runs the full journey deterministically.

## Test & operate

```bash
npm test                             # 59 unit tests (vitest)
npx playwright test                  # E2E: full journey + crisis path + 10-scenario dry runs
node scripts/seed.mjs                # hang the founding collection
node scripts/inspect-paintings.mjs   # audit every row: provenance, panel URLs, seeds
node scripts/regenerate-fillers.mjs  # repaint legacy/fallback canvases through the current pipeline
```

## Deploy (Vercel)

Import the GitHub repo — Next.js is auto-detected, zero build config. Set the env vars from the table above. `pollinations` needs no key, so the museum paints for free out of the box.

## Stack

Next.js 15 (App Router) · React 19 · React Three Fiber + drei · Supabase (Postgres, Storage, Realtime) · OpenAI chat completions for reading + prompt-smithing · Pollinations / Higgsfield / Together / Gemini behind one provider interface · hand-rolled CSS, museum-at-night. All AI and safety live at server choke points; keys never reach the client; RLS is read-only public.

## Process

Built with every idea, decision, and dead end logged in real time — see [JOURNAL.md](JOURNAL.md) for the 10-idea longlist, the council review that cut song-mode and banned synthetic strangers, and the full build log, and [docs/STORY.md](docs/STORY.md) for the submission story.

License: [MIT](LICENSE)
