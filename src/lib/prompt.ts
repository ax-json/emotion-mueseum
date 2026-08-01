import type { ArcBeat, Emotion } from '@/lib/emotion'

// Naming a feeling in an image prompt reliably produces a portrait — every model reads "anxious"
// as a face wearing anxiety. So emotions are translated into pure mark-making instead, and no
// feeling word ever reaches the image provider. The writer's actual arc words live on the plaque.
const GESTURE: Record<Emotion, string> = {
  joy:          'buoyant upward sweeps, open bright centre, loose scattered flecks',
  sadness:      'heavy horizontal bands sinking to the lower edge, washes bleeding downward',
  anger:        'harsh crossing diagonals, scraped and gouged paint, torn ragged edges',
  fear:         'jagged fractured shards, tight compressed marks crowding one corner',
  calm:         'wide still horizontal fields, soft feathered blending, even quiet weight',
  anticipation: 'a leaning forward diagonal, strokes gathering toward one bright edge',
  loneliness:   'one small isolated mark in a vast empty field, wide negative space',
  love:         'two warm overlapping masses merging at their soft blurred boundary',
}

const CONSTRAINTS = [
  'Thick impasto knife strokes and dry-brush gouache texture, visible canvas grain, physical paint.',
  'No text, no letters, no numbers. No people, no face, no portrait, no figure, no body, no eyes — faceless abstraction only.',
  'Museum-quality single cohesive composition, moody low-key gallery lighting.',
].join(' ')

function strengthOf(intensity: number): string {
  return intensity > 0.66 ? 'intense, saturated' : intensity > 0.33 ? 'present, breathing' : 'faint, receding'
}

/* One canvas for one evening: the day's three-beat arc becomes three movements across a single
   composition, left to right — the local, deterministic fallback when ChatGPT is unreachable. */
export function paintingPrompt(beats: ArcBeat[], palettes: string[][]): string {
  const [a, b, c] = beats
  const hexes = [...new Set(palettes.flat())].join(', ')
  return [
    'Non-representational abstract expressionist canvas. Pure colour and texture, no subject matter of any kind.',
    'One evening read left to right as three movements on a single canvas:',
    `it opens with ${GESTURE[a.emotion]} (${strengthOf(a.intensity)});`,
    `the middle turns to ${GESTURE[b.emotion]} (${strengthOf(b.intensity)});`,
    `it closes with ${GESTURE[c.emotion]} (${strengthOf(c.intensity)}).`,
    `Strictly limited palette: ${hexes} on a deep charcoal ground.`,
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
    'Monumental non-representational abstract expressionist mural, painted as if by a hundred hands across one vast canvas.',
    `The field is dominated by ${GESTURE[lead.emotion]},`,
  ]
  if (second) parts.push(`interwoven throughout with ${GESTURE[second.emotion]},`)
  if (third) parts.push(`and carrying a quiet undertone of ${GESTURE[third.emotion]}.`)
  parts.push(
    `Strictly limited palette: ${hexes} on a deep charcoal ground.`,
    'Vast breathing scale, layered sediment of many sessions of paint, edges dissolving into darkness.',
    CONSTRAINTS,
  )
  return parts.join(' ')
}
