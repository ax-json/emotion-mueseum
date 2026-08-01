# Night Register — UI redesign spec (2026-07-31)

Verdict driving this: screens read as "text + rectangle centered on gradient." The museum
must feel entered, not loaded. Two reference axes (from user's 8 Pinterest boards):

- **A. Souls as light** — ICM long-exposure figures, molten gold against deep teal-green
  night, film grain, dendritic filaments, monumental floating gold panels.
- **B. Emotional archive** — museum catalog apparatus: accession numbers, plaque field
  order, registration marks, guide lines, tape fragments, marginalia density.

Palette stays in the existing warm family; one addition: deep teal night tokens
(`--night-teal #10201b`, `--night-teal-deep #0b1512`) as the cold counterpoint that makes
the gold read molten. Serifs unchanged. No new deps. Reduced-motion invariant: every
skipped animation lands on the FINISHED state.

## Global scenography stack (fixed layers, bottom→top)

| z | layer | notes |
|---|-------|-------|
| 0 | liquid blobs + new teal blob | teal low-left, `mix-blend-mode:lighten` |
| 1 | body::after vignette (existing) → strengthened + faux floor gradient | room, not page |
| 2 | content | |
| 3 | ArchiveChrome folio corners | per-phase map, `.arch-note` voice |
| 4 | film grain | feTurbulence data-URI, **soft-light** (overlay dies on near-black), stepped drift |
| 5 | dust motes | ~14 CSS spans, negative delays; hidden under reduced motion |
| 6 | lantern | pointer-following gold radial, `mix-blend-mode:screen`, lerp lag; hover:none → hidden |

## Archive voice

- `.arch-note`: EB Garamond .68rem, uppercase, .18em tracking, `font-feature-settings:"lnum" 1,"tnum" 1`.
- `src/lib/accession.ts`: `accessionOf(row)` → `ACC. NO. 4471 / N26` (deterministic id hash),
  `creditLineOf(row)` → `Gift of a stranger, given in confidence, {date}, after dark`.
- ArchiveChrome folio map: intro `NOCTURNAL REGISTER / fol. 1` → choose `ADMISSIONS / fol. 1 verso`
  → journal `FIELD NOTES / fol. 2` → confirm `PROVISIONAL READING / fol. 2 verso` →
  dissolve `PIGMENT IN SUSPENSION / fol. 3` → reveal `NEW ACQUISITION / fol. 3 verso`.

## Screens

- **Intro**: keep letter-rise but chars *develop* (blur 14px + brightness 2.2 → sharp ink);
  2 CSS light smears drift behind; soul-overlay video stays.
- **Choice**: cards become taped specimens — tape strip pseudo-element, registration corner
  marks, magnetic hover w/ spring release (`createAnimatable`, pointer:fine only).
- **Journal**: wall-label staging (off-axis left), textarea = ruled field-note sheet
  (baseline rules locked to line-height, gold margin rule, vertical `three lines · unedited`),
  counter becomes `ln n / 3`.
- **Confirm**: beats as `I. / II. / III.` roman entries; pencil-scribble ellipse self-draws
  around each emotion (`svg.createDrawable`).
- **Reveal**: full museum wall label under triptych (artist → italic title from arc words →
  medium → dimensions → credit → accession LAST) + noise-masked `RECEIVED — THE NIGHT
  COLLECTION` stamp + dimension line.
- **Museum 3D**: background+fog → `#0b1512` teal night; candle-flicker spotlights (layered
  sines); 400-point dust cloud; plaque → two lines (italic title + tracked catalog line via
  EB Garamond ttf in public/fonts); **red-square fix**: texture loader rejects images ≤2px
  (mock 1×1 red PNGs polluted prod storage) → particle fallback.
- **Thresholds** (last, if green): two-leaf curtain between 2D phases; existing museum
  entry transition stays.

## Order & verification

Phase 1 global stack → Phase 2 screens → Phase 3 3D → Phase 4 thresholds.
After each phase: real-browser screenshot + console clean; end: 31 unit tests + build + E2E.
Full research (36 findings, sources, sketches): workflow wf_362770f3-d77 output.
