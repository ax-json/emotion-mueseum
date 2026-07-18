import { describe, it, expect, beforeEach } from 'vitest'
import { blendVec, analyzeJournal } from '@/lib/extract'
import { EMOTIONS } from '@/lib/emotion'

describe('blendVec', () => {
  it('sums beat intensities per emotion / 3', () => {
    const v = blendVec([
      { word: 'anxious', emotion: 'fear', intensity: 0.9 },
      { word: 'lifted', emotion: 'joy', intensity: 0.6 },
      { word: 'lonely', emotion: 'loneliness', intensity: 0.9 },
    ])
    expect(v[EMOTIONS.indexOf('fear')]).toBeCloseTo(0.3)
    expect(v[EMOTIONS.indexOf('joy')]).toBeCloseTo(0.2)
    expect(v[EMOTIONS.indexOf('sadness')]).toBe(0)
    expect(v).toHaveLength(8)
  })
  it('repeated emotion accumulates', () => {
    const v = blendVec([
      { word: 'sad', emotion: 'sadness', intensity: 0.9 },
      { word: 'down', emotion: 'sadness', intensity: 0.9 },
      { word: 'heavy', emotion: 'sadness', intensity: 0.9 },
    ])
    expect(v[EMOTIONS.indexOf('sadness')]).toBeCloseTo(0.9)
  })
})

describe('analyzeJournal with MOCK_AI', () => {
  beforeEach(() => { process.env.MOCK_AI = '1' })
  it('3 beats, valid emotions, no crisis for plain text', async () => {
    const a = await analyzeJournal('long day at work but dinner with a friend helped')
    expect(a.beats).toHaveLength(3)
    a.beats.forEach(b => expect(EMOTIONS).toContain(b.emotion))
    expect(a.crisis).toBe(false)
  })
  it('mock crisis hook', async () => {
    const a = await analyzeJournal('MOCKCRISIS today')
    expect(a.crisis).toBe(true)
  })
})
