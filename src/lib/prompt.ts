import type { ArcBeat, Emotion } from '@/lib/emotion'

/* House style (locked 2026-08-02 against ten reference pins): dark glitch-collage poster art.
   Near-black ground; one central organic subject half-consumed by digital corruption —
   pixel-sorting, datamosh smears, scanline tears, halftone photocopy fragments — with one
   loud chromatic accent against an otherwise muted field.

   Naming a feeling in an image prompt reliably produces a portrait — every model reads
   "anxious" as a face wearing anxiety. So emotions are translated into corruption behaviour
   and composition instead, and no feeling word ever reaches the image provider. The writer's
   actual arc words live on the plaque. */

const CORRUPTION: Record<Emotion, string> = {
  joy:          'a bloom of light-leaks and bright confetti fragments, pixel-sort rays rising upward',
  sadness:      'heavy dark banding, the image pixel-sorting downward in long drips that dissolve at the bottom edge',
  anger:        'violent horizontal tear-lines, sheared RGB channel splits, slashed and re-taped fragments',
  fear:         'dense compressed static, jittering scanlines, noise crowding claustrophobically into one corner',
  calm:         'wide still negative space, faint film grain, a few clean fragments floating evenly',
  anticipation: 'fragments streaming toward one bright edge, a forward-leaning motion smear',
  loneliness:   'one small element adrift in a vast empty black field, sparse distant noise',
  love:         'two soft forms double-exposed into one another, gentle halation where they overlap',
}

// The one central subject — a symbol for the evening, never a scene. Picked from the
// strongest beat so the local builder stays deterministic without reading the diary.
const SUBJECT: Record<Emotion, string> = {
  joy:          'a burst of wildflowers in full bloom',
  sadness:      'a single wilting rose shedding petals',
  anger:        'a shattering classical statue bust',
  fear:         'a moth caught mid-flight in static',
  calm:         'a still lily resting on dark water',
  anticipation: 'an unfurling fern frond reaching upward',
  loneliness:   'one pale flower alone on a long stem',
  love:         'two roses grown intertwined',
}

const CONSTRAINTS = [
  'Dark analogue-collage poster: layered torn-paper edges, halftone photocopy fragments, film grain, tape and dust.',
  'Any text-like marks must be illegible micro-glyph noise — no readable words, no letters, no numbers.',
  'No recognizable face — human presence only as classical statue fragments, silhouettes, or halftone-shredded anonymous forms; faceless anonymity.',
  'One cohesive poster composition, museum-quality, moody low-key lighting.',
].join(' ')

function strengthOf(intensity: number): string {
  return intensity > 0.66 ? 'consuming most of the frame' : intensity > 0.33 ? 'clearly present' : 'faint, at the edges'
}

/* One canvas for one evening: the day's three-beat arc becomes three movements across a single
   composition, left to right — the local, deterministic fallback when ChatGPT is unreachable. */
export function paintingPrompt(beats: ArcBeat[], palettes: string[][]): string {
  const [a, b, c] = beats
  const lead = [...beats].sort((x, y) => y.intensity - x.intensity)[0]
  const hexes = [...new Set(palettes.flat())].join(', ')
  // style school first, subject mid-prompt — image models obey the first words most,
  // and a subject-first prompt collapses into a clean product photograph
  return [
    'Experimental glitch art collage poster, corrupted digital graphic design, dark analogue collage on a near-black ground.',
    'One evening read left to right as three movements on a single canvas:',
    `it opens with ${CORRUPTION[a.emotion]} (${strengthOf(a.intensity)});`,
    `the middle turns to ${CORRUPTION[b.emotion]} (${strengthOf(b.intensity)});`,
    `it closes with ${CORRUPTION[c.emotion]} (${strengthOf(c.intensity)}).`,
    `Buried inside the layered corruption, half-dissolved: ${SUBJECT[lead.emotion]}.`,
    `Strictly limited palette: ${hexes} as chromatic accents burning against the muted dark field.`,
    CONSTRAINTS,
  ].join(' ')
}

/* The community canvas: everyone's evenings blended into one monumental mural.
   Deterministic by design — it regenerates unattended, so it must never depend on a
   second AI call succeeding. Weights come straight from the mean emotion vector. */
export function communityPrompt(top: { emotion: Emotion; weight: number }[], palettes: string[][]): string {
  const hexes = [...new Set(palettes.flat())].join(', ')
  const [lead, second, third] = top
  const parts = [
    'Monumental experimental glitch art collage mural, corrupted digital graphic design, as if a hundred evenings were layered, torn and re-taped into one vast composition on a near-black ground.',
    `The field is dominated by ${CORRUPTION[lead.emotion]},`,
  ]
  if (second) parts.push(`interwoven throughout with ${CORRUPTION[second.emotion]},`)
  if (third) parts.push(`and carrying a quiet undertone of ${CORRUPTION[third.emotion]}.`)
  parts.push(`Buried at its centre, half-dissolved by the corruption: ${SUBJECT[lead.emotion]}.`)
  parts.push(
    `Strictly limited palette: ${hexes} as chromatic accents burning against the muted dark field.`,
    'Vast breathing scale, layered sediment of many sessions of collage, edges dissolving into darkness.',
    CONSTRAINTS,
  )
  return parts.join(' ')
}
