import type { ImageProvider } from './types'
import { geminiProvider } from './gemini'
import { higgsfieldProvider } from './higgsfield'
import { togetherProvider } from './together'
import { pollinationsProvider } from './pollinations'
import { mockProvider } from './mock'
export type { ImageProvider, ImageRequest } from './types'

export function getProvider(): ImageProvider {
  switch (process.env.IMAGE_PROVIDER) {
    case 'higgsfield': return higgsfieldProvider
    case 'together': return togetherProvider
    case 'pollinations': return pollinationsProvider
    case 'mock': return mockProvider
    default: return geminiProvider
  }
}
