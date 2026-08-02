// Inspect paintings rows: which are real images vs particle-fallback ('' url) vs seeds vs community.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const envText = readFileSync('/Users/aksh/Desktop/hackathons/hack the arts/.env.local', 'utf8')
const env = Object.fromEntries(envText.split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await db.from('paintings').select('id, arc_words, panel_urls, is_seed, session_hash, created_at').order('created_at', { ascending: true })
if (error) { console.error('query failed:', error.message); process.exit(1) }

console.log('IMAGE_PROVIDER(local env):', env.IMAGE_PROVIDER)
console.log('total rows:', data.length)
for (const r of data) {
  const urls = r.panel_urls ?? []
  const kind = r.session_hash === 'community' ? 'COMMUNITY' : r.is_seed ? 'SEED' : 'visitor'
  const urlDesc = urls.map(u => (u === '' ? 'EMPTY' : u.includes('/panels/') ? 'panels:' + u.split('/panels/')[1].slice(0, 24) : u.slice(0, 40))).join(' | ')
  console.log([r.id.slice(0, 8), kind, `${urls.length}p`, (r.arc_words ?? []).join(','), urlDesc, r.created_at.slice(0, 16)].join('  '))
}
