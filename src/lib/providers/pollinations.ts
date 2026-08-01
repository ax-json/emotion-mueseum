import type { ImageProvider } from './types'

// Free and keyless, but the anonymous tier serves ONE request at a time — requests are queued
// here so concurrent paint and community generations never trip the instant 429.
const BASE = 'https://image.pollinations.ai/prompt'
const IMAGE_SIZE = 1024
const RETRY_DELAY_MS = 4000
const MAX_ATTEMPTS = 3
const GAP_BETWEEN_REQUESTS_MS = 800
const MIN_IMAGE_BYTES = 1000

// Module-level chain: each call waits for the previous one, then adds a small gap.
let queue: Promise<unknown> = Promise.resolve()
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task)
  queue = run.then(() => new Promise(r => setTimeout(r, GAP_BETWEEN_REQUESTS_MS)),
                   () => new Promise(r => setTimeout(r, GAP_BETWEEN_REQUESTS_MS)))
  return run
}

// Deterministic seed per prompt: the same evening always yields the same canvas.
function seedFor(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  return Math.abs(h) % 1_000_000
}

export const pollinationsProvider: ImageProvider = {
  name: 'pollinations',
  generateImage(req) {
    const url = `${BASE}/${encodeURIComponent(req.prompt)}`
      + `?width=${IMAGE_SIZE}&height=${IMAGE_SIZE}&nologo=true&seed=${seedFor(req.prompt)}`

    return enqueue(async () => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const res = await fetch(url)
        if (res.ok) {
          const bytes = new Uint8Array(await res.arrayBuffer())
          if (bytes.byteLength < MIN_IMAGE_BYTES) throw new Error('pollinations returned a truncated image')
          return bytes
        }
        const retryable = res.status === 429 || res.status >= 500
        if (!retryable || attempt === MAX_ATTEMPTS) throw new Error(`pollinations ${res.status}`)
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
      }
      throw new Error('pollinations unreachable')
    })
  },
}
