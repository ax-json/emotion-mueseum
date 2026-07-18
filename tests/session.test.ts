import { describe, it, expect, beforeAll } from 'vitest'
import { sessionHash } from '@/lib/session'
beforeAll(() => { process.env.SESSION_SALT = 'test-salt' })
describe('sessionHash', () => {
  it('deterministic', () => expect(sessionHash('abc')).toBe(sessionHash('abc')))
  it('different ids differ', () => expect(sessionHash('abc')).not.toBe(sessionHash('abd')))
  it('does not leak the raw id', () => expect(sessionHash('secret-id')).not.toContain('secret-id'))
})
