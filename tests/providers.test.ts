import { describe, it, expect, afterEach } from 'vitest'
import { getProvider } from '@/lib/providers'
import { togetherProvider } from '@/lib/providers/together'

const req = { prompt: 'abstract impasto field in #3a4468 and #6b729a on charcoal ground, no text, faceless' }

describe('getProvider', () => {
  it('mock env → mock provider returns valid bytes', async () => {
    process.env.IMAGE_PROVIDER = 'mock'
    const prov = getProvider()
    expect(prov.name).toBe('mock')
    const bytes = await prov.generateImage(req)
    expect(bytes.byteLength).toBeGreaterThan(50)
  })
  it('together env → together provider', () => {
    process.env.IMAGE_PROVIDER = 'together'
    expect(getProvider().name).toBe('together')
  })
  it('higgsfield env → higgsfield provider', () => {
    process.env.IMAGE_PROVIDER = 'higgsfield'
    expect(getProvider().name).toBe('higgsfield')
  })
})

describe('togetherProvider', () => {
  const realFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = realFetch })

  it('posts the finished prompt untouched and decodes b64_json to bytes', async () => {
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    let seen: { url: string; body: Record<string, unknown>; auth: string } | null = null
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      seen = { url, body: JSON.parse(String(init.body)), auth: String((init.headers as Record<string, string>).Authorization) }
      return { ok: true, json: async () => ({ data: [{ b64_json: png }] }) }
    }) as unknown as typeof fetch

    process.env.TOGETHER_API_KEY = 'test-key'
    const bytes = await togetherProvider.generateImage(req)

    expect(bytes.byteLength).toBeGreaterThan(50)
    expect(seen!.url).toContain('api.together.xyz')
    expect(seen!.auth).toBe('Bearer test-key')
    expect(String(seen!.body.prompt)).toBe(req.prompt)        // providers must not rewrite the prompt
    expect(seen!.body.response_format).toBe('b64_json')
    expect(Number(seen!.body.steps)).toBeLessThanOrEqual(4)   // FLUX.1-schnell caps at 4 steps
  })

  it('throws on a non-ok response so paint falls back to particles', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 429, text: async () => 'rate limited' })) as unknown as typeof fetch
    await expect(togetherProvider.generateImage(req)).rejects.toThrow(/429/)
  })
})
