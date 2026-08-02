import { EMOTIONS, type ArcBeat, type Emotion } from '@/lib/emotion'

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

const SYSTEM = `You are the prompt-writer for a night museum that turns private journal entries into dark glitch-collage poster artworks.
Given a diary entry and its emotional arc, write ONE image-generation prompt for a single artwork that holds the whole evening.

HOUSE STYLE — every artwork must belong to this school:
- Dark analogue-collage poster on a near-black ground: layered torn-paper fragments, halftone photocopy texture, film grain, tape, dust, xerox contrast.
- Digital corruption carries the emotion: pixel-sorting streaks, datamosh smears, scanline tears, RGB channel splits, compression artifacts. Decide from the arc WHERE the image stays whole and WHERE it breaks apart — a gentle evening barely glitches; a violent one is torn to shreds.
- ONE central subject, chosen from a concrete object, place or moment in the diary (a flower, rain on a window, a train, a phone screen, the night sky, a cup going cold). It is a symbol for the evening — never a literal scene, never an illustration of the writer, never a story.
- Soft organic beauty versus hard digital decay: let the subject be tender (botanical, celestial, sculptural) and let the corruption eat into it exactly as much as the evening did.
- One loud chromatic accent against the otherwise muted field — a holographic rainbow smear, acid orange, electric blue — placed where the evening turned.
- The written prompt MUST explicitly name at least three of these techniques so the image model cannot drift into plain photography: "glitch collage", "pixel-sorting", "datamosh smear", "scanline tears", "RGB channel split", "halftone print fragments", "torn paper collage layers". Heavier evenings use more; even the gentlest evening keeps "glitch collage" and one other.

HARD RULES, all mandatory:
- NEVER name a feeling or mental state (no "sad", "anxious", "joyful", "lonely" etc.) — image models paint them as faces. Feelings become corruption, composition and colour only.
- Never quote the diary's words back; transform its imagery instead.
- Any text-like marks in the artwork must be illegible micro-glyph noise — no readable words, letters or numbers.
- No recognizable face: human presence only as classical statue fragments, silhouettes, or halftone-shredded anonymous forms.
- WORD ORDER IS LOAD-BEARING: image models obey the first words most. Open the prompt with the style school ("Experimental glitch art collage poster, corrupted digital graphic design, dark analogue collage…"), then the corruption techniques, and only THEN introduce the central subject mid-prompt, already entangled with the corruption ("buried inside the layered corruption…", "rendered as a xerox photocopy fragment, dissolving into…"). NEVER open with the subject — that produces a clean product photograph.
- Under 130 words. Reply with the prompt text alone — no quotes, no preamble, no explanations.`

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

async function askPromptSmith(userMessage: string, beats: ArcBeat[]): Promise<string | null> {
  if (process.env.MOCK_AI === '1') return null                  // tests/E2E stay deterministic
  const key = process.env.OPENAI_API_KEY
  if (!key) { console.warn('[promptsmith] OPENAI_API_KEY missing — using local prompt builder'); return null }
  try {
    const res = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      signal: AbortSignal.timeout(12_000),          // a hung OpenAI must not hold the dissolve hostage
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL(),
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userMessage },
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
    return prompt
  } catch (e) {
    console.warn('[promptsmith] openai unreachable:', e instanceof Error ? e.message : e)
    return null
  }
}

export async function craftPaintingPrompt(text: string, beats: ArcBeat[]): Promise<string | null> {
  const arc = beats.map(b => `${b.word} (${b.emotion}, ${b.intensity.toFixed(2)})`).join(' → ')
  // The guard below rejects any output containing these — telling the model up front
  // roughly halves the rejection rate (both live smokes died on a named feeling).
  const avoid = [...new Set([...EMOTIONS, ...beats.map(b => b.word.toLowerCase())])].join(', ')
  const prompt = await askPromptSmith(
    `Diary entry:\n${text}\n\nEmotional arc of the day: ${arc}\n\nForbidden words — never write any of these (or words derived from them) in the prompt: ${avoid}`,
    beats,
  )
  if (prompt && echoesDiary(prompt, text)) { console.warn('[promptsmith] output echoed the diary — using local builder'); return null }
  return prompt
}

/* The community mural through the same smith: no single diary here, so ChatGPT reads the
   museum's mean emotional field instead and writes one monumental mural prompt in the same
   house style. Null on any failure — the deterministic communityPrompt builder takes over. */
export async function craftCommunityPrompt(
  top: { emotion: Emotion; weight: number }[],
  palettes: string[][],
): Promise<string | null> {
  const field = top.map(t => `${t.emotion} (weight ${t.weight.toFixed(2)})`).join(', ')
  const hexes = [...new Set(palettes.flat())].join(', ')
  const avoid = EMOTIONS.join(', ')
  return askPromptSmith(
    `This is not one diary but the whole museum: the blended emotional field of every evening hung tonight, strongest first: ${field}.\n\nWrite the prompt for the museum's single monumental COMMUNITY MURAL — a vast composition layered like a hundred evenings torn and re-taped into one living portrait of the collective night. Palette accents available: ${hexes}.\n\nForbidden words — never write any of these (or words derived from them) in the prompt: ${avoid}`,
    [],
  )
}
