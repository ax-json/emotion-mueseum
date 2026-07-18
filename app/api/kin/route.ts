import { NextRequest, NextResponse } from 'next/server'
import { topKin } from '@/lib/emotion'
import { serverDb } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { vec, excludeId } = await req.json().catch(() => ({}))
  if (!Array.isArray(vec) || vec.length !== 8) return NextResponse.json({ kin: [] })
  const { data } = await serverDb().from('paintings').select('*').order('created_at', { ascending: false }).limit(500)
  const rows = (data ?? []).filter(r => r.id !== excludeId)
  return NextResponse.json({ kin: topKin(vec.map(Number), rows, 4) })
}
