import { createHash } from 'crypto'

// server-only (node crypto) — import ONLY from API routes
export function sessionHash(sessionId: string): string {
  return createHash('sha256').update(process.env.SESSION_SALT + ':' + sessionId).digest('hex').slice(0, 32)
}

// browser-only (Web Crypto) — import ONLY from client components
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('museum-session')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('museum-session', id) }
  return id
}
