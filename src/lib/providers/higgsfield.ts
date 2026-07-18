import { panelPrompt, type ImageProvider } from './types'

// endpoint/field names verified against platform.higgsfield.ai during live smoke; adjust strings only
const BASE = 'https://platform.higgsfield.ai'
const headers = () => ({ 'hf-api-key': process.env.HF_API_KEY!, 'hf-secret': process.env.HF_SECRET!, 'content-type': 'application/json' })

export const higgsfieldProvider: ImageProvider = {
  name: 'higgsfield',
  async generatePanel(req) {
    const create = await fetch(`${BASE}/v1/text2image`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ params: { prompt: panelPrompt(req), width_and_height: '1024x1024', quality: 'basic' } }),
    })
    if (!create.ok) throw new Error(`higgsfield create ${create.status}`)
    const { id } = await create.json()
    for (let i = 0; i < 30; i++) {                                   // poll up to ~60s
      await new Promise(r => setTimeout(r, 2000))
      const poll = await fetch(`${BASE}/v1/job-sets/${id}`, { headers: headers() })
      const job = await poll.json()
      const done = (job.jobs ?? []).find((j: { status: string }) => j.status === 'completed')
      if (done?.results?.raw?.url) {
        const img = await fetch(done.results.raw.url)
        return new Uint8Array(await img.arrayBuffer())
      }
      if ((job.jobs ?? []).length && job.jobs.every((j: { status: string }) => j.status === 'failed')) throw new Error('higgsfield failed')
    }
    throw new Error('higgsfield timeout')
  },
}
