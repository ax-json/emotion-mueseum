/* The museum's registrar grammar. Derived deterministically from the row so the same
   painting carries the same number on the reveal plaque, the 3D label and the chrome —
   no DB column needed. */
const SERIAL_RANGE = 9000
const SERIAL_FLOOR = 1000

export function accessionOf(p: { id: string; created_at: string }): string {
  if (String(p.id).startsWith('local-')) return 'ACC. PENDING'
  const hash = [...String(p.id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)
  const seq = (Math.abs(hash) % SERIAL_RANGE) + SERIAL_FLOOR
  const yy = new Date(p.created_at).getFullYear() % 100
  return `ACC. NO. ${seq} / N${yy}`
}

export function creditLineOf(p: { created_at: string; is_seed: boolean }): string {
  if (p.is_seed) return 'Founding collection'
  const d = new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return `Gift of a stranger, given in confidence, ${d}, after dark`
}
