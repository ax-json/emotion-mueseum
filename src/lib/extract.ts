import { GoogleGenAI } from '@google/genai'
import { EMOTIONS, type ArcBeat, type Emotion, type EmotionVec } from '@/lib/emotion'

export interface JournalAnalysis { beats: ArcBeat[]; crisis: boolean; abusive: boolean }

// Google retires model ids without warning — pin here, override per-env if one dies mid-event.
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash'

export function blendVec(beats: ArcBeat[]): EmotionVec {
  const v = EMOTIONS.map(() => 0)
  for (const b of beats) v[EMOTIONS.indexOf(b.emotion)] += b.intensity / 3
  return v.map(x => Math.min(1, x))
}

const PROMPT = `You analyze one private journal entry about someone's day. Reply with STRICT JSON only:
{"beats":[{"word":string,"emotion":string,"intensity":number},{...},{...}],"crisis":boolean,"abusive":boolean}
Rules: exactly 3 beats = the emotional arc in chronological order (beginning, middle, end of the day).
"word": ONE lowercase feeling word in the writer's own register. "emotion": exactly one of ${EMOTIONS.join(', ')}.
"intensity": 0..1. "crisis": true only if the entry signals self-harm or suicide risk.
"abusive": true only if the entry is hate speech, slurs, or spam unrelated to feelings.
Entry:
`

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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  const res = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: PROMPT + text,
    config: { responseMimeType: 'application/json', temperature: 0.4 },
  })
  const raw = JSON.parse(res.text ?? '{}')
  const beats: ArcBeat[] = (raw.beats ?? []).slice(0, 3).map((b: Record<string, unknown>) => ({
    word: String(b.word ?? 'quiet').toLowerCase().slice(0, 24),
    emotion: (EMOTIONS as readonly string[]).includes(String(b.emotion)) ? (b.emotion as Emotion) : 'calm',
    intensity: Math.min(1, Math.max(0, Number(b.intensity) || 0.5)),
  }))
  while (beats.length < 3) beats.push({ word: 'quiet', emotion: 'calm', intensity: 0.4 })
  return { beats, crisis: Boolean(raw.crisis), abusive: Boolean(raw.abusive) }
}
