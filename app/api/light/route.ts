import { NextRequest, NextResponse } from 'next/server'
import { sessionHash } from '@/lib/session'
import { serverDb } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const hash = sessionHash(req.headers.get('x-session-id') ?? 'anon')
  const { paintingId } = await req.json().catch(() => ({}))
  if (!paintingId) return NextResponse.json({ ok: false })
  const db = serverDb()
  const dayAgo = new Date(Date.now() - 86400_000).toISOString()
  const { count } = await db.from('lights_log').select('*', { count: 'exact', head: true }).eq('session_hash', hash).gte('created_at', dayAgo)
  if ((count ?? 0) >= 20) return NextResponse.json({ ok: false })
  const ins = await db.from('lights_log').insert({ painting_id: paintingId, session_hash: hash })
  if (ins.error) {                                   // duplicate PK = already lit → idempotent success
    const { data } = await db.from('paintings').select('lights').eq('id', paintingId).single()
    return NextResponse.json({ ok: true, lights: data?.lights ?? 0 })
  }
  const { data } = await db.rpc('increment_lights', { pid: paintingId })
  return NextResponse.json({ ok: true, lights: data ?? 0 })
}
