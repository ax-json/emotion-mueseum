// usage: node scripts/seed.mjs https://your-app.vercel.app
// env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (to flip is_seed)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const base = process.argv[2] ?? 'http://localhost:3000'
const entries = JSON.parse(readFileSync('scripts/seed-entries.json', 'utf8'))
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
for (const [i, text] of entries.entries()) {
  const sid = 'seed-' + i
  const j = await fetch(base + '/api/journal', { method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': sid }, body: JSON.stringify({ text }) }).then(r => r.json())
  if (j.status !== 'ok') { console.log(i, 'skipped:', j.status); continue }
  const p = await fetch(base + '/api/paint', { method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': sid }, body: JSON.stringify({ beats: j.beats }) }).then(r => r.json())
  if (p.status === 'ok') { await db.from('paintings').update({ is_seed: true }).eq('id', p.painting.id); console.log(i, 'hung', p.painting.id) }
  else console.log(i, 'paint failed:', p.status)
  await new Promise(r => setTimeout(r, 1500))
}
