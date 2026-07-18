import type { ImageProvider } from './types'
// minimal valid 1x1 PNG — real bytes for upload paths in tests/E2E
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
export const mockProvider: ImageProvider = {
  name: 'mock',
  async generatePanel() { return Uint8Array.from(Buffer.from(PNG_B64, 'base64')) },
}
