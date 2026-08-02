import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { craftPaintingPrompt, craftCommunityPrompt } from '@/lib/promptsmith'
import type { ArcBeat } from '@/lib/emotion'

const beats: ArcBeat[] = [
  { word: 'anxious', emotion: 'fear', intensity: 0.7 },
  { word: 'lifted', emotion: 'joy', intensity: 0.6 },
  { word: 'lonely', emotion: 'loneliness', intensity: 0.8 },
]
const GOOD_PROMPT = 'Abstract expressionist canvas: jagged violet shards crowding the left edge dissolve into buoyant golden sweeps at centre, closing on one small amber mark adrift in deep indigo negative space; thick impasto knife strokes, dry-brush texture, visible canvas grain, low-key gallery lighting.'

const realFetch = globalThis.fetch
const realKey = process.env.OPENAI_API_KEY
const realMock = process.env.MOCK_AI

beforeEach(() => { process.env.OPENAI_API_KEY = 'test-key'; delete process.env.MOCK_AI })
afterEach(() => {
  globalThis.fetch = realFetch
  if (realKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = realKey
  if (realMock === undefined) delete process.env.MOCK_AI; else process.env.MOCK_AI = realMock
})

function stubOpenAI(content: string, ok = true, status = 200) {
  let seen: { url: string; body: Record<string, unknown>; auth: string } | null = null
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen = { url, body: JSON.parse(String(init.body)), auth: String((init.headers as Record<string, string>).Authorization) }
    return {
      ok, status,
      text: async () => 'err',
      json: async () => ({ choices: [{ message: { content } }] }),
    }
  }) as unknown as typeof fetch
  return () => seen
}

describe('craftPaintingPrompt', () => {
  it('sends the diary and arc to chat completions and returns the crafted prompt', async () => {
    const seen = stubOpenAI(GOOD_PROMPT)
    const out = await craftPaintingPrompt('rough morning, warm lunch, quiet night', beats)
    expect(out).toBe(GOOD_PROMPT)
    const s = seen()!
    expect(s.url).toContain('api.openai.com/v1/chat/completions')
    expect(s.auth).toBe('Bearer test-key')
    const msgs = s.body.messages as { role: string; content: string }[]
    expect(msgs[1].content).toContain('rough morning')
    expect(msgs[1].content).toContain('anxious')
  })
  it('returns null without a key so the local builder takes over', async () => {
    delete process.env.OPENAI_API_KEY
    expect(await craftPaintingPrompt('a day', beats)).toBeNull()
  })
  it('returns null in mock mode — E2E must stay deterministic', async () => {
    process.env.MOCK_AI = '1'
    expect(await craftPaintingPrompt('a day', beats)).toBeNull()
  })
  it('rejects output that names a feeling — portraits are a spec violation', async () => {
    stubOpenAI(GOOD_PROMPT.replace('jagged violet shards', 'an anxious storm of lonely marks'))
    expect(await craftPaintingPrompt('a day', beats)).toBeNull()
  })
  it('rejects derived feeling words too — "joyful" is still joy', async () => {
    stubOpenAI(GOOD_PROMPT.replace('buoyant golden sweeps', 'joyful golden sweeps'))
    expect(await craftPaintingPrompt('a day', beats)).toBeNull()
  })
  it('rejects output that quotes the diary — diary words must never reach an image provider', async () => {
    stubOpenAI(GOOD_PROMPT + ' echoing the words rough morning at the office again')
    expect(await craftPaintingPrompt('it was a rough morning at the office and then it rained', beats)).toBeNull()
  })
  it('returns null on an HTTP error instead of throwing', async () => {
    stubOpenAI('', false, 500)
    expect(await craftPaintingPrompt('a day', beats)).toBeNull()
  })
  it('returns null on unusably short output', async () => {
    stubOpenAI('nice painting')
    expect(await craftPaintingPrompt('a day', beats)).toBeNull()
  })
})

describe('craftCommunityPrompt', () => {
  const top = [
    { emotion: 'loneliness' as const, weight: 0.4 },
    { emotion: 'fear' as const, weight: 0.3 },
    { emotion: 'joy' as const, weight: 0.2 },
  ]
  const palettes = [['#223', '#445'], ['#667', '#889']]

  it('asks chat completions for a mural prompt naming the collective field', async () => {
    const seen = stubOpenAI(GOOD_PROMPT)
    const out = await craftCommunityPrompt(top, palettes)
    expect(out).toBe(GOOD_PROMPT)
    const s = seen()!
    expect(s.url).toContain('api.openai.com/v1/chat/completions')
    const msgs = s.body.messages as { role: string; content: string }[]
    expect(msgs[1].content).toContain('loneliness')
    expect(msgs[1].content.toLowerCase()).toContain('mural')
  })
  it('returns null without a key so the deterministic mural builder takes over', async () => {
    delete process.env.OPENAI_API_KEY
    expect(await craftCommunityPrompt(top, palettes)).toBeNull()
  })
  it('rejects mural prompts that name a feeling', async () => {
    stubOpenAI(GOOD_PROMPT.replace('jagged violet shards', 'a lonely fearful storm'))
    expect(await craftCommunityPrompt(top, palettes)).toBeNull()
  })
})
