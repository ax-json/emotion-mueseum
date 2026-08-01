import { GoogleGenAI } from '@google/genai'
import type { ImageProvider } from './types'

// Image models need a billed Google project — the free tier grants limit: 0. Override if an id retires.
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image'

export const geminiProvider: ImageProvider = {
  name: 'gemini',
  async generateImage(req) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
    const res = await ai.models.generateContent({ model: IMAGE_MODEL, contents: req.prompt })
    for (const part of res.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) return Uint8Array.from(Buffer.from(part.inlineData.data, 'base64'))
    }
    throw new Error('no image in response')
  },
}
