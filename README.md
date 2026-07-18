# Emotion Museum

> *Technology gets blamed for making us lonely. We used it to let strangers find each other through feelings, not faces.*

<!-- HERO GIF: docs/demo/museum-pan.gif — record with IMAGE_PROVIDER=higgsfield before submission -->
![museum pan](docs/demo/museum-pan.gif)

Tell the museum about your day. An AI reads the emotional arc — three plain words you can correct — and paints it as a triptych while your words visibly dissolve into the pigment. Your painting then hangs in a shared 3D night-museum **beside strangers who felt the same**, matched on an 8-dimension emotion fingerprint, never on text. You can leave an anonymous light under a stranger's painting. Every visitor's feelings also feed one communal mural that has never existed before and will never exist again.

**Visit the museum:** `https://YOUR-DEPLOYMENT.vercel.app` *(link goes live at submission — the magic is reachable in under 60 seconds: write three honest lines, watch them become paint)*

**2-minute demo video:** `docs/demo/demo.mp4` *(recording pending)*

Every judge who tries the app joins the corpus — later judges see earlier judges' paintings hanging in the halls.

## How it works

```
you write (or speak) 3 honest lines
        │  analyzed in memory — never stored, never logged
        ▼
emotional arc: "anxious · lifted · lonely"   ← one tap to correct
        │
        ▼
3 panels painted in parallel (Gemini image / Higgsfield / particle fallback)
your words dissolve into the pigment while the paint dries
        │
        ▼
3D night-museum: valence → left/right wall, arousal → hanging height
your emotional kin (cosine similarity) hang beside you
        │
        ▼
leave a light · communal mural grows with every entry (Supabase Realtime)
```

**There is no column for your words.** The database stores only: three feeling-words, an 8-float emotion vector, valence/arousal, panel image URLs, and a salted session hash. Nothing else exists to leak.

## Safety

- **Crisis handling** — entries signaling self-harm swap the painting flow for a gentle helpline card (iCall, AASRA, findahelpline.com). Non-negotiable, server-side.
- **No fake strangers** — the first 15 paintings are the builder's own days, plaqued "founding collection". Kin matches are always real entries.
- **No error screens** — every failure resolves to art: generation fails → deterministic particle painting; DB down → your painting lives on your device tonight; daily cap hit → "the museum is resting."
- **Rate limits** — 3 paintings/hour per session, 20 lights/day, global daily cap.
- **Abuse filter** — hate/spam classified server-side and quietly declined.

## Run it locally

```bash
npm install
cp .env.example .env.local        # fill in your keys
npm run dev                       # http://localhost:3000
```

- `GEMINI_API_KEY` — arc extraction (gemini-2.5-flash) + default painter (gemini-2.5-flash-image)
- `IMAGE_PROVIDER=gemini | higgsfield | mock` — painter backend; `mock` needs no keys
- Supabase: run `supabase/schema.sql`, create public storage bucket `panels`, enable Realtime on `paintings`
- `MOCK_AI=1 IMAGE_PROVIDER=mock npm run dev` — full journey with zero keys (deterministic mock arc + 1×1 panels)

```bash
npm test              # 24 unit tests (vitest)
npx playwright test   # E2E: full journey + crisis path
node scripts/seed.mjs # hang the founding collection
```

## Stack

Next.js 15 (App Router) · React 19 · React Three Fiber + drei · Supabase (Postgres, Storage, Realtime) · Gemini + Higgsfield behind a provider abstraction · hand-rolled CSS, museum-at-night. All AI and safety at server choke points; keys never reach the client; RLS is read-only public.

## Process

This was built with every idea, decision, and dead end logged in real time — see [JOURNAL.md](JOURNAL.md) for the full history: the 10-idea longlist, the council review that cut song-mode and banned synthetic strangers, the form-factor debate, and the build log.

License: [MIT](LICENSE)
