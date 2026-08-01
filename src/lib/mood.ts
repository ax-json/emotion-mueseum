/* The visitor's own reading — what the analysis AI decided about their evening — carried
   into the museum so the ambience bends around them. Only the derived labels travel
   (valence, arousal, a tint, the arc words); the written text never leaves the request.
   sessionStorage: one tab's visit, gone when the visit ends. */

export interface VisitorMood {
  valence: number      // -1..1, the AI's read of how the day sat
  arousal: number      // 0..1, how loudly it sat there
  tint: string         // lead colour of the AI-chosen emotion palette
  words: string[]      // the three arc words
}

export interface Ambience {
  dustMul: number      // particle density
  speedMul: number     // particle drift speed
  rayMul: number       // god-ray strength
  ambientMul: number   // base light level
  fogNearMul: number   // <1 pulls the fog in close, like a held breath
  motto: string | null // one personal line for the wing label
}

const KEY = 'em-mood'
const UPLIFTED = 0.18
const HEAVY = -0.18
const RESTLESS = 0.68
const QUIET = 0.32

export function saveMood(m: VisitorMood) {
  try { sessionStorage.setItem(KEY, JSON.stringify(m)) } catch { /* private mode — the night stays impersonal */ }
}

export function loadMood(): VisitorMood | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const m = JSON.parse(raw)
    if (typeof m.valence !== 'number' || typeof m.arousal !== 'number' || typeof m.tint !== 'string') return null
    return { valence: m.valence, arousal: m.arousal, tint: m.tint, words: Array.isArray(m.words) ? m.words : [] }
  } catch { return null }
}

/* The museum is never punitive: a heavy day gets its softest light, not a darker room. */
export function ambienceFor(m: VisitorMood | null): Ambience {
  if (!m) return { dustMul: 1, speedMul: 1, rayMul: 1, ambientMul: 1, fogNearMul: 1, motto: null }
  const uplifted = m.valence > UPLIFTED
  const heavy = m.valence < HEAVY
  const restless = m.arousal > RESTLESS
  const quiet = m.arousal < QUIET
  return {
    dustMul: (uplifted ? 1.4 : heavy ? 0.7 : 1) * (restless ? 1.4 : quiet ? 0.65 : 1),
    speedMul: (uplifted ? 1.3 : 1) * (restless ? 1.7 : quiet ? 0.55 : 1),
    rayMul: uplifted ? 1.6 : heavy ? 0.55 : 1,
    ambientMul: uplifted ? 1.12 : heavy ? 0.88 : 1,
    fogNearMul: heavy ? 0.72 : 1,
    motto: uplifted
      ? 'the museum burns a little brighter for you tonight'
      : heavy
        ? 'the museum keeps its softest light on for you'
        : restless
          ? 'the dust is quick tonight — like you'
          : quiet
            ? 'the halls hold their breath with you'
            : 'the night arranged itself around your day',
  }
}
