import { describe, it, expect } from 'vitest'
import { paintingPrompt, communityPrompt } from '@/lib/prompt'
import type { ArcBeat } from '@/lib/emotion'

const beats: ArcBeat[] = [
  { word: 'anxious', emotion: 'fear', intensity: 0.7 },
  { word: 'lifted', emotion: 'joy', intensity: 0.6 },
  { word: 'lonely', emotion: 'loneliness', intensity: 0.8 },
]
const palettes = [['#4b3a5e', '#2a2136'], ['#d9a441', '#f2d49b'], ['#3a4468', '#6b729a']]

describe('paintingPrompt — one canvas for the whole evening', () => {
  it('reads as a single canvas with three movements, not three panels', () => {
    const p = paintingPrompt(beats, palettes).toLowerCase()
    expect(p).toContain('single canvas')
    expect(p).toContain('it opens with')
    expect(p).toContain('it closes with')
  })
  it('translates every beat into corruption behaviour and carries the palette hexes', () => {
    const p = paintingPrompt(beats, palettes).toLowerCase()
    expect(p).toContain('compressed static')             // fear
    expect(p).toContain('light-leaks')                   // joy
    expect(p).toContain('adrift in a vast empty')        // loneliness
    expect(p).toContain('#4b3a5e'); expect(p).toContain('#d9a441'); expect(p).toContain('#3a4468')
  })
  it('anchors the strongest beat as the central subject', () => {
    const p = paintingPrompt(beats, palettes).toLowerCase()
    expect(p).toContain('one pale flower alone on a long stem')   // loneliness at 0.8 leads
  })
  it('never names a feeling — feeling words make models paint portraits', () => {
    const p = paintingPrompt(beats, palettes).toLowerCase()
    for (const w of ['anxious', 'fear', 'joy', 'lonely', 'loneliness', 'lifted']) expect(p).not.toContain(w)
  })
  it('keeps the glitch-collage and faceless constraints', () => {
    const p = paintingPrompt(beats, palettes).toLowerCase()
    expect(p).toMatch(/halftone|pixel-sort|film grain/); expect(p).toMatch(/no readable words/); expect(p).toMatch(/faceless/)
  })
})

describe('communityPrompt — the monumental communal mural', () => {
  const top = [
    { emotion: 'calm' as const, weight: 0.4 },
    { emotion: 'sadness' as const, weight: 0.3 },
    { emotion: 'love' as const, weight: 0.2 },
  ]
  it('speaks at mural scale and weaves the top emotions as corruption', () => {
    const p = communityPrompt(top, palettes).toLowerCase()
    expect(p).toContain('monumental')
    expect(p).toContain('wide still negative space')     // calm leads
    expect(p).toContain('heavy dark banding')            // sadness woven in
    expect(p).toContain('double-exposed')                // love undertone
  })
  it('never names a feeling and stays faceless', () => {
    const p = communityPrompt(top, palettes).toLowerCase()
    for (const w of ['calm', 'sadness', 'love']) expect(p).not.toContain(w)
    expect(p).toMatch(/faceless/)
  })
  it('survives a field with fewer than three emotions', () => {
    const p = communityPrompt([top[0]], palettes).toLowerCase()
    expect(p).toContain('wide still negative space')
    expect(p).not.toContain('undefined')
  })
})
