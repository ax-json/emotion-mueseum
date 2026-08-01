import { EMOTIONS, type Emotion, type EmotionVec } from '@/lib/emotion'

/* The community painting is an ordinary paintings row wearing a sentinel session_hash —
   zero schema change, full RLS/read-path reuse. Everything that renders paintings must
   filter it out of the normal hang and give it the centerpiece treatment instead. */
export const COMMUNITY_SESSION = 'community'

export function meanVec(vecs: EmotionVec[]): EmotionVec {
  const sum = EMOTIONS.map(() => 0)
  for (const v of vecs) for (let i = 0; i < EMOTIONS.length; i++) sum[i] += v[i] ?? 0
  const n = Math.max(1, vecs.length)
  return sum.map(x => x / n)
}

export function topEmotions(vec: EmotionVec, n = 3): { emotion: Emotion; weight: number }[] {
  return EMOTIONS
    .map((emotion, i) => ({ emotion, weight: vec[i] ?? 0 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n)
    .filter(e => e.weight > 0)
}
