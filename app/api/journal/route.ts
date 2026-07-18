import { NextRequest, NextResponse } from 'next/server'
import { analyzeJournal } from '@/lib/extract'
import { checkLimits, keywordFallback } from '@/lib/ratelimit'
import { sessionHash } from '@/lib/session'
import { serverDb } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const hash = sessionHash(req.headers.get('x-session-id') ?? 'anon')
  const { text } = await req.json().catch(() => ({ text: '' }))
  if (typeof text !== 'string' || text.trim().length < 3) return NextResponse.json({ status: 'rejected' })
  const trimmed = text.slice(0, 600)            // request scope only — never logged, never stored

  const limit = await checkLimits(serverDb(), hash).catch(() => 'ok' as const)   // DB down must not block art
  if (limit !== 'ok') return NextResponse.json({ status: limit })

  try {
    const a = await analyzeJournal(trimmed)
    if (a.crisis) return NextResponse.json({ status: 'crisis' })
    if (a.abusive) return NextResponse.json({ status: 'rejected' })
    return NextResponse.json({ status: 'ok', beats: a.beats })
  } catch {
    return NextResponse.json({ status: 'ok', beats: keywordFallback(trimmed) })
  }
}
