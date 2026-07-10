# Hack the Arts — [Name TBD]

**Theme:** Create art that couldn't exist without technology.
**Status:** Concept locked 2026-07-10 (council-reviewed, 5-lens panel, unanimous MODIFY → revised). Full history in [JOURNAL.md](JOURNAL.md).

## Concept (locked)

An anonymous emotional-kinship artwork. People journal about their day; their feelings become paintings; the paintings find them strangers who felt the same — no names, no likes, no text ever shown. The whole room's feelings fuse into one communal mural that has never existed before and will never exist again.

**One experience, one flow:**

1. **Journal** — user (or audience member via QR) anonymously writes/speaks a few lines about their day.
2. **Arc confirm** — AI extracts the day's emotional arc as three plain words ("anxious / lifted / lonely"), one tap to confirm or edit. Gives authorship, rescues misreads.
3. **Painting** — triptych composition: each emotional beat owns a panel (deterministic layout, AI paints texture/palette inside it — AI as pigment, not painter). Panels generate in parallel. As the painting forms, the journal's words **visibly dissolve into the pigment** — deletion performed, not claimed.
4. **Kin-wall** — emotion vector (valence/arousal axes, not topic embeddings) matches you with anonymous people *physically present* — the audience's own QR entries are the corpus. Palette-echo animation shows the shared color between your painting and your kin's ("you both had the same blue"). One ritual action: **leave a light** — anonymous tap adds a small glow to a stranger's painting.
5. **Communal mural** — every entry feeds a live room-scale mural. Local p5.js particle layer reacts instantly (works offline); AI repaints emotion-clustered tiles every ~8 contributions.

## Form factor (locked 2026-07-10)

**Hybrid:** 2D journal flow (intimate, phone-friendly) → camera flies into a **3D night-museum gallery on rails** (React Three Fiber; one emotion-room + lobby mural wall; click-to-dolly, no WASD walking). Your painting glides onto the wall beside your emotional kin — kinship as spatial adjacency. Leave-a-light = small glow under a stranger's painting.
- Fallback if 3D slips: 2D CSS parallax gallery wall (80% of feel, 20% of work).
- **Judging is async via GitHub**: every judge who tries the hosted app joins the corpus — later judges see earlier judges' paintings. Repo must have: README GIF of the museum, 2-min demo video, one-click Vercel link (magic reachable in <60s).

## Hard requirements (from council)

- **No fake strangers.** Kin matches are real, present people. Never seed synthetic entries as "users."
- **Honest privacy:** "we never store your words" (not "words deleted"). Client-side extraction where possible.
- **Crisis handling:** self-harm signals swap kin-wall for a gentle resource card. Non-negotiable.
- **Demo armor:** local particle layer as guaranteed baseline, cached fallback paintings, judge speaks entry (no live typing), troll filter + rate limit on room inputs.
- **Song mode: CUT** as live feature. Timed-brushstroke engine reused to animate the journal painting; optional 15s pre-rendered clip as pitch encore.

## Pitch arc (3 min)

1. Cold open: "Technology gets blamed for making us lonely. We used it to let strangers find each other through feelings, not faces."
2. Judge speaks a 3-line journal → arc confirm → triptych forms, words dissolve.
3. Kin-wall reveal: "someone three rows behind you felt this too."
4. Zoom out: the room's mural, morphing live.
5. Close: "No accounts. No likes. We never store your words — only color remains."

## Build priority

1. Journal → arc → triptych painting (core)
2. Kin matching + kin-wall + leave-a-light (soul)
3. Room QR intake + communal mural (climax)
4. Words-dissolve animation, palette-echo, polish
5. (encore only) pre-rendered song-mode clip

## Naming

"Sonder" rejected — existing wellbeing app, same category. Candidates under discussion — see JOURNAL.md.
