import { NextResponse } from 'next/server'
import { paletteFor, valence, arousal, type EmotionVec } from '@/lib/emotion'
import { COMMUNITY_SESSION, meanVec, topEmotions } from '@/lib/community'
import { communityPrompt } from '@/lib/prompt'
import { craftCommunityPrompt } from '@/lib/promptsmith'
import { getProvider } from '@/lib/providers'
import { serverDb } from '@/lib/supabase'

/* The museum's one communal canvas: a LIVING PORTRAIT — the mean emotion of every evening
   hung here, repainted whenever a new diary entry arrives. Clients nudge this endpoint
   fire-and-forget after a new painting and on museum entry; the gate below repaints only
   when a visitor painting is newer than the mural, so each new entry changes the portrait
   exactly once and idle nudges are free.

   Concurrency and abuse share one defence: an ATOMIC claim. The regeneration is gated by a
   conditional UPDATE that bumps created_at forward only while the mural is still older than
   the newest visitor painting — exactly one concurrent caller wins the row, every loser
   returns immediately, and an anonymous curl loop without new entries never triggers a
   generation (entries themselves are rate-limited). The canvas row is then updated IN PLACE
   (same id, no delete/insert), so there is no sweep to race, no lights_log FK to trip, and
   a failed generation simply leaves the previous painting hanging. */

const SAMPLE_SIZE = 500

export async function POST() {
  const db = serverDb()

  // a failed read must NOT read as "no canvas yet" — that would disarm the keep-previous guard
  const existing = await db.from('paintings').select('id, created_at, panel_urls')
    .eq('session_hash', COMMUNITY_SESSION).order('created_at', { ascending: false }).limit(1)
  if (existing.error) return NextResponse.json({ ok: false, reason: 'read failed' })
  const current = existing.data?.[0]

  const sample = await db.from('paintings').select('emotion_vec, created_at')
    .neq('session_hash', COMMUNITY_SESSION).order('created_at', { ascending: false }).limit(SAMPLE_SIZE)
  const vecs = (sample.data ?? []).map(r => r.emotion_vec as EmotionVec).filter(v => Array.isArray(v))
  if (!vecs.length) return NextResponse.json({ ok: false, reason: 'no paintings yet' })

  // the living-portrait gate: repaint only when an entry arrived after the mural's last coat
  const newestEntryAt = sample.data?.[0]?.created_at ?? ''
  if (current && current.created_at >= newestEntryAt) return NextResponse.json({ ok: true, fresh: true })

  const vec = meanVec(vecs)
  const top = topEmotions(vec, 3)
  if (!top.length) return NextResponse.json({ ok: false, reason: 'empty emotion field' })
  // arc_words check requires exactly 3 — pad with the leading emotion when the field is narrow
  const words = [0, 1, 2].map(i => (top[i] ?? top[0]).emotion as string)
  const palette = words.map(w => paletteFor(w as (typeof top)[0]['emotion']))
  const stats = { arc_words: words, emotion_vec: vec, valence: valence(vec), arousal: arousal(vec), palette }

  let claimId: string
  let previousUrl = ''
  if (current) {
    // the atomic claim: bump created_at forward only while it is still older than the newest entry
    const claim = await db.from('paintings').update({ created_at: new Date().toISOString() })
      .eq('id', current.id).lt('created_at', newestEntryAt).select('id')
    if (claim.error || !claim.data?.length) return NextResponse.json({ ok: true, fresh: true })
    claimId = current.id
    previousUrl = current.panel_urls?.[0] ?? ''
  } else {
    // first boot: insert a placeholder row as the claim; if two boot at once, newest wins
    const boot = await db.from('paintings')
      .insert({ ...stats, panel_urls: [''], session_hash: COMMUNITY_SESSION }).select('id').single()
    if (boot.error) return NextResponse.json({ ok: false, reason: 'claim failed' })
    claimId = boot.data.id
    const newest = await db.from('paintings').select('id').eq('session_hash', COMMUNITY_SESSION)
      .order('created_at', { ascending: false }).limit(1)
    if (!newest.error && newest.data?.[0] && newest.data[0].id !== claimId) {
      await db.from('paintings').delete().eq('id', claimId)      // lost the boot race — yield
      return NextResponse.json({ ok: true, fresh: true })
    }
  }

  let url = ''
  try {
    // ChatGPT writes the mural prompt from the collective field; the deterministic
    // builder is the safety net so a repaint never depends on a second AI call succeeding.
    const crafted = await craftCommunityPrompt(top, palette)
    const bytes = await getProvider().generateImage({ prompt: crafted ?? communityPrompt(top, palette) })
    const up = await db.storage.from('panels').upload(`community-${crypto.randomUUID()}.png`, bytes, { contentType: 'image/png' })
      .then(r => ({ error: r.error, path: r.data?.path }))
      .catch(() => ({ error: true as const, path: undefined }))
    if (up.error || !up.path) console.warn('[community] upload failed:', up.error)
    else url = db.storage.from('panels').getPublicUrl(up.path).data.publicUrl
  } catch (e) {
    console.warn('[community] generation failed:', e instanceof Error ? e.message : e)
  }
  // a dead provider must not erase a standing canvas — the claim already re-armed the
  // staleness gate, so the previous painting simply hangs on for another window
  if (!url && previousUrl) return NextResponse.json({ ok: false, reason: 'generation failed — kept previous' })

  const upd = await db.from('paintings')
    .update({ ...stats, panel_urls: [url] }).eq('id', claimId).select().single()
  if (upd.error) {
    console.warn('[community] update failed:', upd.error.message)
    return NextResponse.json({ ok: false })
  }

  // retire the replaced storage object, best effort — otherwise the bucket grows forever
  const oldPath = previousUrl.split('/panels/')[1]
  if (oldPath && url && !previousUrl.includes(url)) {
    await db.storage.from('panels').remove([oldPath]).catch(() => {})
  }

  return NextResponse.json({ ok: true, painting: upd.data })
}
