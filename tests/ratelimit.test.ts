import { describe, it, expect } from 'vitest'
import { decideLimit, keywordFallback } from '@/lib/ratelimit'
import { EMOTIONS } from '@/lib/emotion'

describe('decideLimit', () => {
  it('under caps → ok', () => expect(decideLimit(2, 10, 150)).toBe('ok'))
  it('3 in last hour → limited', () => expect(decideLimit(3, 10, 150)).toBe('limited'))
  it('global cap → resting (wins over limited)', () => expect(decideLimit(3, 150, 150)).toBe('resting'))
})
describe('keywordFallback', () => {
  it('always 3 valid beats', () => {
    const b = keywordFallback('i felt sad then angry then okay')
    expect(b).toHaveLength(3); b.forEach(x => expect(EMOTIONS).toContain(x.emotion))
  })
  it('picks up obvious words', () => {
    expect(keywordFallback('lonely all evening').some(x => x.emotion === 'loneliness')).toBe(true)
  })
})
