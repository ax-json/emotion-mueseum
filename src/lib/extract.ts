import { EMOTIONS, type ArcBeat, type Emotion, type EmotionVec } from '@/lib/emotion'

export interface JournalAnalysis { beats: ArcBeat[]; crisis: boolean; abusive: boolean }

/* ChatGPT as the museum's professional reader: it hears the diary entry (request scope only —
   never logged, never stored) and names the three-beat emotional arc of the day. Throws on any
   failure so the journal route can fall back to the deterministic keyword reading. */

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MODEL = () => process.env.OPENAI_MODEL || 'gpt-4o-mini'   // pin + override, same policy as promptsmith
const TIMEOUT_MS = 12_000

export function blendVec(beats: ArcBeat[]): EmotionVec {
  const v = EMOTIONS.map(() => 0)
  for (const b of beats) v[EMOTIONS.indexOf(b.emotion)] += b.intensity / 3
  return v.map(x => Math.min(1, x))
}

const SYSTEM = `You analyze one private journal entry about someone's day. Reply with STRICT JSON only:
{"beats":[{"word":string,"emotion":string,"intensity":number},{...},{...}],"crisis":boolean,"abusive":boolean}
Rules: exactly 3 beats = the emotional arc in chronological order (beginning, middle, end of the day).
"word": ONE lowercase feeling word in the writer's own register. "emotion": exactly one of ${EMOTIONS.join(', ')}.
"intensity": 0..1. "crisis": true only if the entry signals self-harm or suicide risk.
"abusive": true only if the entry is hate speech, slurs, or spam unrelated to feelings.`

function mockAnalysis(text: string): JournalAnalysis {
  return {
    beats: [
      { word: 'anxious', emotion: 'fear', intensity: 0.7 },
      { word: 'lifted', emotion: 'joy', intensity: 0.6 },
      { word: 'lonely', emotion: 'loneliness', intensity: 0.8 },
    ],
    crisis: text.includes('MOCKCRISIS'),
    abusive: text.includes('MOCKABUSE'),
  }
}

export async function analyzeJournal(text: string): Promise<JournalAnalysis> {
  if (process.env.MOCK_AI === '1') return mockAnalysis(text)
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('[extract] OPENAI_API_KEY missing')

  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),      // a hung OpenAI must not hold the reading hostage
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL(),
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Entry:\n${text}` },
      ],
      temperature: 0.4,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`[extract] openai ${res.status}: ${(await res.text()).slice(0, 200)}`)

  const content = (await res.json())?.choices?.[0]?.message?.content
  const raw = JSON.parse(typeof content === 'string' ? content : '{}')
  const beats: ArcBeat[] = (raw.beats ?? []).slice(0, 3).map((b: Record<string, unknown>) => ({
    word: String(b.word ?? 'quiet').toLowerCase().slice(0, 24),
    emotion: (EMOTIONS as readonly string[]).includes(String(b.emotion)) ? (b.emotion as Emotion) : 'calm',
    intensity: Math.min(1, Math.max(0, Number(b.intensity) || 0.5)),
  }))
  while (beats.length < 3) beats.push({ word: 'quiet', emotion: 'calm', intensity: 0.4 })
  return { beats, crisis: Boolean(raw.crisis), abusive: Boolean(raw.abusive) }
}
