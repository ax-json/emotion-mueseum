// Repaint filler-era paintings (particle line-art rows, mock-arc spam, pre-house-style
// images) through the current glitch-collage pipeline via pollinations.
// Usage: node scripts/regenerate-fillers.mjs [--all]
//   default: rows created before CUTOFF or with any empty panel url
//   --all:   every visitor row
// One-off ops tool: the prompt builder below is a copy of src/lib/prompt.ts (TS, not
// importable from .mjs); if the house style changes, regenerate from the app instead.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const CUTOFF = '2026-08-01T19:49:00'          // first known-good house-style painting
const EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'calm', 'anticipation', 'loneliness', 'love']
const IMAGE_SIZE = 1024
const MIN_IMAGE_BYTES = 1000
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 4000
const GAP_MS = 1200

const CORRUPTION = {
  joy: 'a bloom of light-leaks and bright confetti fragments, pixel-sort rays rising upward',
  sadness: 'heavy dark banding, the image pixel-sorting downward in long drips that dissolve at the bottom edge',
  anger: 'violent horizontal tear-lines, sheared RGB channel splits, slashed and re-taped fragments',
  fear: 'dense compressed static, jittering scanlines, noise crowding claustrophobically into one corner',
  calm: 'wide still negative space, faint film grain, a few clean fragments floating evenly',
  anticipation: 'fragments streaming toward one bright edge, a forward-leaning motion smear',
  loneliness: 'one small element adrift in a vast empty black field, sparse distant noise',
  love: 'two soft forms double-exposed into one another, gentle halation where they overlap',
}
const SUBJECT = {
  joy: 'a burst of wildflowers in full bloom',
  sadness: 'a single wilting rose shedding petals',
  anger: 'a shattering classical statue bust',
  fear: 'a moth caught mid-flight in static',
  calm: 'a still lily resting on dark water',
  anticipation: 'an unfurling fern frond reaching upward',
  loneliness: 'one pale flower alone on a long stem',
  love: 'two roses grown intertwined',
}
const CONSTRAINTS = [
  'Dark analogue-collage poster: layered torn-paper edges, halftone photocopy fragments, film grain, tape and dust.',
  'Any text-like marks must be illegible micro-glyph noise — no readable words, no letters, no numbers.',
  'No recognizable face — human presence only as classical statue fragments, silhouettes, or halftone-shredded anonymous forms; faceless anonymity.',
  'One cohesive poster composition, museum-quality, moody low-key lighting.',
].join(' ')

const strengthOf = i => (i > 0.66 ? 'consuming most of the frame' : i > 0.33 ? 'clearly present' : 'faint, at the edges')

function beatsFrom(vec) {
  const ranked = EMOTIONS.map((emotion, i) => ({ emotion, weight: vec?.[i] ?? 0 }))
    .sort((a, b) => b.weight - a.weight).filter(e => e.weight > 0)
  const top = ranked.length ? ranked : [{ emotion: 'calm', weight: 0.4 }]
  return [0, 1, 2].map(i => {
    const t = top[i] ?? top[0]
    return { emotion: t.emotion, intensity: Math.min(1, t.weight * 3) }
  })
}

function paintingPrompt(beats, palettes) {
  const [a, b, c] = beats
  const lead = [...beats].sort((x, y) => y.intensity - x.intensity)[0]
  const hexes = [...new Set(palettes.flat())].join(', ')
  return [
    'Experimental glitch art collage poster, corrupted digital graphic design, dark analogue collage on a near-black ground.',
    'One evening read left to right as three movements on a single canvas:',
    `it opens with ${CORRUPTION[a.emotion]} (${strengthOf(a.intensity)});`,
    `the middle turns to ${CORRUPTION[b.emotion]} (${strengthOf(b.intensity)});`,
    `it closes with ${CORRUPTION[c.emotion]} (${strengthOf(c.intensity)}).`,
    `Buried inside the layered corruption, half-dissolved: ${SUBJECT[lead.emotion]}.`,
    hexes ? `Strictly limited palette: ${hexes} as chromatic accents burning against the muted dark field.` : '',
    CONSTRAINTS,
  ].filter(Boolean).join(' ')
}

async function generate(prompt, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${IMAGE_SIZE}&height=${IMAGE_SIZE}&nologo=true&seed=${seed}`
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url).catch(() => null)
    if (res?.ok) {
      const bytes = new Uint8Array(await res.arrayBuffer())
      if (bytes.byteLength >= MIN_IMAGE_BYTES) return bytes
    }
    if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
  }
  throw new Error('pollinations failed after retries')
}

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(envText.split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const all = process.argv.includes('--all')
const { data: rows, error } = await db.from('paintings')
  .select('id, arc_words, emotion_vec, palette, panel_urls, created_at')
  .neq('session_hash', 'community').order('created_at', { ascending: true })
if (error) { console.error('query failed:', error.message); process.exit(1) }

const targets = rows.filter(r => all
  || r.created_at < CUTOFF
  || (r.panel_urls ?? []).some(u => !u))
console.log(`repainting ${targets.length} of ${rows.length} rows`)

let done = 0, failed = 0
for (const r of targets) {
  const beats = beatsFrom(r.emotion_vec)
  const palettes = Array.isArray(r.palette) && r.palette.length ? r.palette : [['#8a8f98']]
  const prompt = paintingPrompt(beats, palettes)
  const seed = Math.floor(Math.random() * 1_000_000)   // vary per row — many rows share one arc
  try {
    const bytes = await generate(prompt, seed)
    const path = `${randomUUID()}.png`
    const up = await db.storage.from('panels').upload(path, bytes, { contentType: 'image/png' })
    if (up.error) throw new Error('upload: ' + up.error.message)
    const url = db.storage.from('panels').getPublicUrl(path).data.publicUrl
    const oldPaths = (r.panel_urls ?? []).map(u => u.split('/panels/')[1]).filter(Boolean)
    const upd = await db.from('paintings').update({ panel_urls: [url] }).eq('id', r.id)
    if (upd.error) throw new Error('update: ' + upd.error.message)
    if (oldPaths.length) await db.storage.from('panels').remove(oldPaths).catch(() => {})
    done++
    console.log(`✓ ${r.id.slice(0, 8)}  ${(r.arc_words ?? []).join(',')}`)
  } catch (e) {
    failed++
    console.warn(`✗ ${r.id.slice(0, 8)}  ${(r.arc_words ?? []).join(',')}  ${e.message}`)
  }
  await new Promise(r2 => setTimeout(r2, GAP_MS))
}
console.log(`done: ${done} repainted, ${failed} failed`)
