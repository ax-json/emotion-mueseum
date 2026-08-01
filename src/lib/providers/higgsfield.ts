import type { ImageProvider } from './types'

/* Contract per docs.higgsfield.ai (guides/images + how-to/introduction, checked 2026-08-01):
   POST {BASE}/{model_path} with Authorization: Key {api_key}:{secret}, body
   { prompt, aspect_ratio, resolution }; then GET {BASE}/requests/{request_id}/status until
   status is completed ({ images: [{ url }] }) or failed/nsfw (credits refunded). */
const BASE = 'https://platform.higgsfield.ai'
const MODEL_PATH = () => process.env.HF_MODEL_PATH || 'higgsfield-ai/soul/standard'
const ASPECT = () => process.env.HF_ASPECT_RATIO || '1:1'
const RESOLUTION = () => process.env.HF_RESOLUTION || '720p'
const POLL_MS = 2000
const MAX_POLLS = 45                                  // ~90s ceiling

const headers = () => ({
  Authorization: `Key ${process.env.HF_API_KEY}:${process.env.HF_SECRET}`,
  'content-type': 'application/json',
  accept: 'application/json',
})

export const higgsfieldProvider: ImageProvider = {
  name: 'higgsfield',
  async generateImage(req) {
    const create = await fetch(`${BASE}/${MODEL_PATH()}`, {
      method: 'POST', headers: headers(), signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({ prompt: req.prompt, aspect_ratio: ASPECT(), resolution: RESOLUTION() }),
    })
    if (!create.ok) throw new Error(`higgsfield create ${create.status}: ${(await create.text()).slice(0, 200)}`)
    const created = await create.json()
    const requestId = created?.request_id ?? created?.id      // submit-response field name is undocumented
    if (!requestId) throw new Error(`higgsfield create returned no request id: ${JSON.stringify(created).slice(0, 200)}`)

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise(r => setTimeout(r, POLL_MS))
      const poll = await fetch(`${BASE}/requests/${requestId}/status`, { headers: headers(), signal: AbortSignal.timeout(10_000) })
        .catch(() => null)
      if (!poll?.ok) continue                                 // transient poll failures must not kill the job
      const job = await poll.json()
      if (job?.status === 'completed') {
        const url = job?.images?.[0]?.url
        if (!url) throw new Error('higgsfield completed without an image url')
        const img = await fetch(url, { signal: AbortSignal.timeout(30_000) })
        if (!img.ok) throw new Error(`higgsfield image fetch ${img.status}`)
        return new Uint8Array(await img.arrayBuffer())
      }
      if (job?.status === 'failed' || job?.status === 'nsfw') throw new Error(`higgsfield ${job.status}`)
    }
    throw new Error('higgsfield timeout')
  },
}
