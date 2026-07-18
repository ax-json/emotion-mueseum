import type { ImageProvider } from './types'
import { geminiProvider } from './gemini'
import { higgsfieldProvider } from './higgsfield'
import { mockProvider } from './mock'
export { panelPrompt } from './types'
export type { ImageProvider, PanelRequest } from './types'

export function getProvider(): ImageProvider {
  switch (process.env.IMAGE_PROVIDER) {
    case 'higgsfield': return higgsfieldProvider
    case 'mock': return mockProvider
    default: return geminiProvider
  }
}
