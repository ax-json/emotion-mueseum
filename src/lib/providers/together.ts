import type { ImageProvider } from './types'

// FLUX.1-schnell-Free is Together's no-cost tier: no card, ~2-4s per image, 4-step schnell cap.
const MODEL = process.env.TOGETHER_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell-Free'
const ENDPOINT = 'https://api.together.xyz/v1/images/generations'
const MAX_SCHNELL_STEPS = 4
const IMAGE_SIZE = 1024

export const togetherProvider: ImageProvider = {
  name: 'together',
  async generateImage(req) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: req.prompt,
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        steps: MAX_SCHNELL_STEPS,
        n: 1,
        response_format: 'b64_json',
      }),
    })
    if (!res.ok) throw new Error(`together ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const b64 = (await res.json())?.data?.[0]?.b64_json
    if (!b64) throw new Error('no image in response')
    return Uint8Array.from(Buffer.from(b64, 'base64'))
  },
}
