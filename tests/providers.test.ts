import { describe, it, expect } from 'vitest'
import { panelPrompt, getProvider } from '@/lib/providers'

const req = { arcWord: 'lonely', emotion: 'loneliness' as const, intensity: 0.8, palette: ['#3a4468', '#6b729a', '#23283d'] }

describe('panelPrompt', () => {
  it('contains palette hexes and arc word', () => {
    const p = panelPrompt(req)
    expect(p).toContain('#3a4468'); expect(p.toLowerCase()).toContain('lonely')
  })
  it('painterly constraints, forbids text/faces', () => {
    const p = panelPrompt(req).toLowerCase()
    expect(p).toMatch(/impasto|gouache|brush/); expect(p).toMatch(/no text/); expect(p).toMatch(/no faces|faceless/)
  })
})
describe('getProvider', () => {
  it('mock env → mock provider returns valid bytes', async () => {
    process.env.IMAGE_PROVIDER = 'mock'
    const prov = getProvider()
    expect(prov.name).toBe('mock')
    const bytes = await prov.generatePanel(req)
    expect(bytes.byteLength).toBeGreaterThan(50)
  })
})
