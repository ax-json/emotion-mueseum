import { describe, it, expect } from 'vitest'
import { EMOTIONS, cosineSim, valence, arousal, paletteFor, wallPosition, topKin } from '@/lib/emotion'

const vec = (e: string, x = 1) => EMOTIONS.map(k => (k === e ? x : 0))

describe('cosineSim', () => {
  it('identical vectors → 1', () => expect(cosineSim(vec('joy'), vec('joy'))).toBeCloseTo(1))
  it('orthogonal → 0', () => expect(cosineSim(vec('joy'), vec('sadness'))).toBeCloseTo(0))
  it('zero vector → 0, no NaN', () => expect(cosineSim(vec('joy', 0), vec('joy'))).toBe(0))
})

describe('valence/arousal', () => {
  it('pure joy: positive valence, mid-high arousal', () => {
    expect(valence(vec('joy'))).toBeGreaterThan(0.5)
    expect(arousal(vec('joy'))).toBeGreaterThan(0.4)
  })
  it('pure loneliness: negative valence, low arousal', () => {
    expect(valence(vec('loneliness'))).toBeLessThan(-0.5)
    expect(arousal(vec('loneliness'))).toBeLessThan(0.4)
  })
  it('bounded for all-ones vector', () => {
    const all = EMOTIONS.map(() => 1)
    expect(valence(all)).toBeGreaterThanOrEqual(-1); expect(valence(all)).toBeLessThanOrEqual(1)
    expect(arousal(all)).toBeGreaterThanOrEqual(0); expect(arousal(all)).toBeLessThanOrEqual(1)
  })
})

describe('paletteFor', () => {
  it('3 hex strings per emotion', () => EMOTIONS.forEach(e => {
    const p = paletteFor(e); expect(p).toHaveLength(3); p.forEach(h => expect(h).toMatch(/^#[0-9a-f]{6}$/i))
  }))
})

describe('wallPosition', () => {
  it('deterministic for same seed', () => expect(wallPosition(0.5, 0.5, 7)).toEqual(wallPosition(0.5, 0.5, 7)))
  it('valence maps left/right', () => expect(wallPosition(-1, 0.5, 1).x).toBeLessThan(wallPosition(1, 0.5, 1).x))
  it('arousal maps height within reach', () => {
    const lo = wallPosition(0, 0, 1).y, hi = wallPosition(0, 1, 1).y
    expect(hi).toBeGreaterThan(lo); expect(lo).toBeGreaterThan(0.5); expect(hi).toBeLessThan(3.2)
  })
})

describe('topKin', () => {
  const mixed = EMOTIONS.map(k => (k === 'joy' ? 0.9 : k === 'loneliness' ? 0.4 : 0))
  const rows = [
    { id: 'a', emotion_vec: vec('joy') }, { id: 'b', emotion_vec: vec('sadness') },
    { id: 'c', emotion_vec: vec('loneliness') }, { id: 'd', emotion_vec: mixed },
  ]
  it('ranks matching emotion first', () => {
    const k = topKin(vec('joy'), rows, 2)
    expect(k[0].id).toBe('a'); expect(k[1].id).toBe('d')
  })
  it('respects n', () => expect(topKin(vec('joy'), rows, 1)).toHaveLength(1))
})
