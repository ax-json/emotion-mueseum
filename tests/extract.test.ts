import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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

describe('analyzeJournal via ChatGPT', () => {
  const realFetch = globalThis.fetch
  const openaiReply = (payload: unknown) =>
    new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }), { status: 200 })

  beforeEach(() => {
    delete process.env.MOCK_AI
    process.env.OPENAI_API_KEY = 'test-key'
  })
  afterEach(() => {
    globalThis.fetch = realFetch
    process.env.MOCK_AI = '1'
  })

  it('sends the entry to the OpenAI chat completions API and parses beats', async () => {
    let captured: { url: string; body: Record<string, unknown> } | undefined
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: String(url), body: JSON.parse(String(init?.body)) }
      return openaiReply({
        beats: [
          { word: 'Heavy', emotion: 'sadness', intensity: 0.8 },
          { word: 'steady', emotion: 'calm', intensity: 2 },
          { word: 'warm', emotion: 'love', intensity: 0.6 },
        ],
        crisis: false,
        abusive: false,
      })
    }) as typeof fetch
    const a = await analyzeJournal('rough morning, quiet evening')
    expect(captured?.url).toContain('api.openai.com/v1/chat/completions')
    expect(captured?.body.response_format).toEqual({ type: 'json_object' })
    expect(JSON.stringify(captured?.body.messages)).toContain('rough morning, quiet evening')
    expect(a.beats[0]).toEqual({ word: 'heavy', emotion: 'sadness', intensity: 0.8 })
    expect(a.beats[1].intensity).toBe(1)
    expect(a.crisis).toBe(false)
  })

  it('coerces unknown emotions to calm and pads short arcs to 3 beats', async () => {
    globalThis.fetch = (async () =>
      openaiReply({ beats: [{ word: 'weird', emotion: 'confusion', intensity: 0.5 }], crisis: false, abusive: false })) as typeof fetch
    const a = await analyzeJournal('odd day')
    expect(a.beats).toHaveLength(3)
    expect(a.beats[0].emotion).toBe('calm')
    a.beats.forEach(b => expect(EMOTIONS).toContain(b.emotion))
  })

  it('surfaces crisis and abusive flags', async () => {
    globalThis.fetch = (async () =>
      openaiReply({ beats: [], crisis: true, abusive: true })) as typeof fetch
    const a = await analyzeJournal('dark entry')
    expect(a.crisis).toBe(true)
    expect(a.abusive).toBe(true)
  })

  it('throws on HTTP error so the route can keyword-fallback', async () => {
    globalThis.fetch = (async () => new Response('rate limited', { status: 429 })) as typeof fetch
    await expect(analyzeJournal('any day')).rejects.toThrow()
  })

  it('throws when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY
    await expect(analyzeJournal('any day')).rejects.toThrow()
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
