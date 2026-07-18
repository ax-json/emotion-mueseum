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
