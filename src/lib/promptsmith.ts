import { EMOTIONS, type ArcBeat } from '@/lib/emotion'

/* ChatGPT as the museum's prompt-smith: it reads the diary entry (request scope only — never
   logged, never stored) and writes the one painting prompt Higgsfield will receive. The image
   comes straight back to us from the image provider; routing it back through ChatGPT would add
   a second paid hop and latency for nothing — the model has no role once the prompt is written.

   Returns null on any failure (no key, HTTP error, unusable output) so the caller can fall
   back to the deterministic lib/prompt builder. Never throws. */

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MODEL = () => process.env.OPENAI_MODEL || 'gpt-4o-mini'   // pin + override, same policy as Gemini ids
const MIN_USABLE_CHARS = 60
const MAX_PROMPT_CHARS = 900

const SYSTEM = `You are the prompt-writer for an art museum that turns private journal entries into abstract paintings.
Given a diary entry and its emotional arc, write ONE image-generation prompt for a single painting that holds the whole evening.
Hard rules, all mandatory:
- Non-representational abstract expressionism only: colour, gesture, texture, composition.
- NEVER name a feeling or mental state (no "sad", "anxious", "joyful", "lonely" etc.) — image models paint them as faces. Translate feelings into mark-making, movement and colour instead.
- No people, faces, figures, bodies, eyes; no text, letters or numbers in the image.
- Painterly language: impasto, knife strokes, dry-brush, washes, canvas grain, gallery lighting.
- Under 120 words. Reply with the prompt text alone — no quotes, no preamble, no explanations.`

function violates(prompt: string, beats: ArcBeat[]): boolean {
  // The one spec rule worth double-checking by machine: a named feeling reliably becomes a portrait.
  // Word-boundary + stem matching — a plain substring check with a length cutoff exempted 'joy'.
  const banned = [...EMOTIONS, ...beats.map(b => b.word.toLowerCase())]
    .map(w => w.replace(/[^a-z0-9]/gi, ''))
    .filter(Boolean)
  return banned.some(w => new RegExp(`\\b${w}\\w*`, 'i').test(prompt))
}

/* The crafted prompt must describe the evening, never quote it: any run of diary words
   surviving into the prompt would flow on to image providers (and, with pollinations,
   into a GET url that third-party CDNs log). Four consecutive shared words = rejection. */
const ECHO_RUN_WORDS = 4
function echoesDiary(prompt: string, diary: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const d = norm(diary)
  if (d.length < ECHO_RUN_WORDS) return false
  const grams = new Set<string>()
  for (let i = 0; i <= d.length - ECHO_RUN_WORDS; i++) grams.add(d.slice(i, i + ECHO_RUN_WORDS).join(' '))
  const p = norm(prompt)
  for (let i = 0; i <= p.length - ECHO_RUN_WORDS; i++) if (grams.has(p.slice(i, i + ECHO_RUN_WORDS).join(' '))) return true
  return false
}

export async function craftPaintingPrompt(text: string, beats: ArcBeat[]): Promise<string | null> {
  if (process.env.MOCK_AI === '1') return null                  // tests/E2E stay deterministic
  const key = process.env.OPENAI_API_KEY
  if (!key) { console.warn('[promptsmith] OPENAI_API_KEY missing — using local prompt builder'); return null }

  const arc = beats.map(b => `${b.word} (${b.emotion}, ${b.intensity.toFixed(2)})`).join(' → ')
  try {
    const res = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      signal: AbortSignal.timeout(12_000),          // a hung OpenAI must not hold the dissolve hostage
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL(),
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Diary entry:\n${text}\n\nEmotional arc of the day: ${arc}` },
        ],
        temperature: 0.8,
        max_tokens: 260,
      }),
    })
    if (!res.ok) {
      console.warn(`[promptsmith] openai ${res.status}: ${(await res.text()).slice(0, 200)}`)
      return null
    }
    const raw = (await res.json())?.choices?.[0]?.message?.content
    const prompt = typeof raw === 'string' ? raw.trim().replace(/^["'`]+|["'`]+$/g, '').slice(0, MAX_PROMPT_CHARS) : ''
    if (prompt.length < MIN_USABLE_CHARS) { console.warn('[promptsmith] unusably short output'); return null }
    if (violates(prompt, beats)) { console.warn('[promptsmith] output named a feeling — using local builder'); return null }
    if (echoesDiary(prompt, text)) { console.warn('[promptsmith] output echoed the diary — using local builder'); return null }
    return prompt
  } catch (e) {
    console.warn('[promptsmith] openai unreachable:', e instanceof Error ? e.message : e)
    return null
  }
}
