import { describe, it, expect } from 'vitest'
import { meanVec, topEmotions, COMMUNITY_SESSION } from '@/lib/community'

describe('meanVec', () => {
  it('averages element-wise across all vectors', () => {
    const m = meanVec([
      [1, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0, 0, 0],
    ])
    expect(m[0]).toBeCloseTo(0.5)
    expect(m[1]).toBeCloseTo(0.5)
    expect(m[2]).toBe(0)
  })
  it('returns a zero vector for an empty museum instead of dividing by zero', () => {
    expect(meanVec([])).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })
  it('treats short or ragged vectors as zero-padded', () => {
    const m = meanVec([[1], [1, 1]])
    expect(m[0]).toBeCloseTo(1)
    expect(m[1]).toBeCloseTo(0.5)
    expect(m[7]).toBe(0)
  })
})

describe('topEmotions', () => {
  it('ranks by weight and keeps canonical emotion names', () => {
    // canonical order: joy,sadness,anger,fear,calm,anticipation,loneliness,love
    const top = topEmotions([0.1, 0.5, 0, 0, 0.9, 0, 0.3, 0], 3)
    expect(top.map(t => t.emotion)).toEqual(['calm', 'sadness', 'loneliness'])
  })
  it('drops zero-weight emotions rather than padding with them', () => {
    const top = topEmotions([0.2, 0, 0, 0, 0, 0, 0, 0], 3)
    expect(top).toHaveLength(1)
    expect(top[0].emotion).toBe('joy')
  })
})

describe('COMMUNITY_SESSION sentinel', () => {
  it('can never collide with a real hex session hash of any length', () => {
    expect(COMMUNITY_SESSION).not.toMatch(/^[0-9a-f]+$/)
  })
})
