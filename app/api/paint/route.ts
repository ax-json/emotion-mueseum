import { NextRequest, NextResponse } from 'next/server'
import { EMOTIONS, paletteFor, valence, arousal, type ArcBeat, type Emotion } from '@/lib/emotion'
import { blendVec } from '@/lib/extract'
import { getProvider } from '@/lib/providers'
import { checkLimits } from '@/lib/ratelimit'
import { sessionHash } from '@/lib/session'
import { serverDb } from '@/lib/supabase'

function sanitizeBeats(input: unknown): ArcBeat[] | null {
  if (!Array.isArray(input) || input.length !== 3) return null
  return input.map(b => ({
    word: String(b?.word ?? '').toLowerCase().slice(0, 24) || 'quiet',
    emotion: ((EMOTIONS as readonly string[]).includes(b?.emotion) ? b.emotion : 'calm') as Emotion,
    intensity: Math.min(1, Math.max(0, Number(b?.intensity) || 0.5)),
  }))
}

export async function POST(req: NextRequest) {
  const hash = sessionHash(req.headers.get('x-session-id') ?? 'anon')
  const body = await req.json().catch(() => ({}))
  const beats = sanitizeBeats(body.beats)
  if (!beats) return NextResponse.json({ status: 'rejected' })

  const db = serverDb()
  const limit = await checkLimits(db, hash).catch(() => 'ok' as const)
  if (limit !== 'ok') return NextResponse.json({ status: limit })

  const vec = blendVec(beats)                       // server recomputes — never trusts a client vector
  const palette = beats.map(b => paletteFor(b.emotion))
  const provider = getProvider()

  const panels = await Promise.allSettled(beats.map(b =>
    provider.generatePanel({ arcWord: b.word, emotion: b.emotion, intensity: b.intensity, palette: paletteFor(b.emotion) })))

  const urls: string[] = []
  for (const p of panels) {
    if (p.status === 'fulfilled') {
      const up = await db.storage.from('panels').upload(`${crypto.randomUUID()}.png`, p.value, { contentType: 'image/png' })
        .then(r => ({ error: r.error, path: r.data?.path }))
        .catch(() => ({ error: true as const, path: undefined }))
      urls.push(up.error || !up.path ? '' : db.storage.from('panels').getPublicUrl(up.path).data.publicUrl)
    } else urls.push('')                            // '' => client renders ParticlePanel (spec §7)
  }

  const row = {
    arc_words: beats.map(b => b.word), emotion_vec: vec,
    valence: valence(vec), arousal: arousal(vec),
    panel_urls: urls, palette, session_hash: hash,
  }
  const ins = await db.from('paintings').insert(row).select().single()
  if (ins.error) return NextResponse.json({
    status: 'solo',
    painting: { ...row, id: 'local-' + Date.now(), lights: 0, is_seed: false, created_at: new Date().toISOString(), mine: true },
  })
  return NextResponse.json({ status: 'ok', painting: { ...ins.data, mine: true } })
}
