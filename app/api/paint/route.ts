import { NextRequest, NextResponse } from 'next/server'
import { EMOTIONS, paletteFor, valence, arousal, type ArcBeat, type Emotion } from '@/lib/emotion'
import { blendVec } from '@/lib/extract'
import { getProvider } from '@/lib/providers'
import { paintingPrompt } from '@/lib/prompt'
import { craftPaintingPrompt } from '@/lib/promptsmith'
import { checkLimits } from '@/lib/ratelimit'
import { sessionHash } from '@/lib/session'
import { serverDb } from '@/lib/supabase'

const MAX_TEXT_CHARS = 600                          // same cap as /api/journal — request scope only

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
  const text = typeof body.text === 'string' ? body.text.slice(0, MAX_TEXT_CHARS) : ''

  const db = serverDb()
  const limit = await checkLimits(db, hash).catch(() => 'ok' as const)
  if (limit !== 'ok') return NextResponse.json({ status: limit })

  const vec = blendVec(beats)                       // server recomputes — never trusts a client vector
  const palette = beats.map(b => paletteFor(b.emotion))

  // One evening → one canvas. ChatGPT writes the prompt from the diary itself; if it can't,
  // the deterministic arc-gesture builder takes over so a painting always happens.
  const crafted = text ? await craftPaintingPrompt(text, beats) : null
  const prompt = crafted ?? paintingPrompt(beats, palette)

  let url = ''
  try {
    const bytes = await getProvider().generateImage({ prompt })
    const up = await db.storage.from('panels').upload(`${crypto.randomUUID()}.png`, bytes, { contentType: 'image/png' })
      .then(r => ({ error: r.error, path: r.data?.path }))
      .catch(() => ({ error: true as const, path: undefined }))
    if (up.error || !up.path) console.warn('[paint] upload failed:', up.error)
    else url = db.storage.from('panels').getPublicUrl(up.path).data.publicUrl
  } catch (e) {
    // The viewer never sees an error by design, so the server has to say it out loud — a dead
    // provider is otherwise indistinguishable from intentional particle art.
    console.warn('[paint] generation failed:', e instanceof Error ? e.message : e)
  }

  const row = {
    arc_words: beats.map(b => b.word), emotion_vec: vec,
    valence: valence(vec), arousal: arousal(vec),
    panel_urls: [url],                              // single canvas; '' => client renders ParticlePanel
    palette, session_hash: hash,
  }
  const ins = await db.from('paintings').insert(row).select().single()
  if (ins.error) return NextResponse.json({
    status: 'solo',
    painting: { ...row, id: 'local-' + Date.now(), lights: 0, is_seed: false, created_at: new Date().toISOString(), mine: true },
  })
  return NextResponse.json({ status: 'ok', painting: { ...ins.data, mine: true } })
}
