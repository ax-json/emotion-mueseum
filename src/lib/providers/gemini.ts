import { GoogleGenAI } from '@google/genai'
import { panelPrompt, type ImageProvider } from './types'

export const geminiProvider: ImageProvider = {
  name: 'gemini',
  async generatePanel(req) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: panelPrompt(req) })
    for (const part of res.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) return Uint8Array.from(Buffer.from(part.inlineData.data, 'base64'))
    }
    throw new Error('no image in response')
  },
}
