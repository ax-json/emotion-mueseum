import type { SupabaseClient } from '@supabase/supabase-js'
import { type ArcBeat, type Emotion } from '@/lib/emotion'

export function decideLimit(hourCount: number, dayGlobal: number, cap: number): 'ok' | 'limited' | 'resting' {
  if (dayGlobal >= cap) return 'resting'
  if (hourCount >= 3) return 'limited'
  return 'ok'
}

export async function checkLimits(db: SupabaseClient, hash: string): Promise<'ok' | 'limited' | 'resting'> {
  const hourAgo = new Date(Date.now() - 3600_000).toISOString()
  const dayAgo = new Date(Date.now() - 86400_000).toISOString()
  const [mine, all] = await Promise.all([
    db.from('paintings').select('id', { count: 'exact', head: true }).eq('session_hash', hash).gte('created_at', hourAgo),
    db.from('paintings').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
  ])
  return decideLimit(mine.count ?? 0, all.count ?? 0, Number(process.env.DAILY_PAINTING_CAP ?? 150))
}

const KEYWORDS: [RegExp, Emotion][] = [
  [/lonel|alone|miss/i, 'loneliness'], [/sad|down|cried|heavy/i, 'sadness'],
  [/angr|furious|mad|annoy/i, 'anger'], [/anxi|afraid|scared|worr|stress/i, 'fear'],
  [/calm|peace|quiet|okay|fine/i, 'calm'], [/excit|hope|forward|nervous/i, 'anticipation'],
  [/love|warm|friend|together/i, 'love'], [/happ|joy|laugh|great|good/i, 'joy'],
]
export function keywordFallback(text: string): ArcBeat[] {
  const found = KEYWORDS.filter(([re]) => re.test(text)).map(([, e]) => e)
  const picks: Emotion[] = [found[0] ?? 'calm', found[1] ?? found[0] ?? 'calm', found[2] ?? found[found.length - 1] ?? 'calm']
  return picks.map(e => ({ word: e === 'calm' ? 'quiet' : e, emotion: e, intensity: 0.5 }))
}
