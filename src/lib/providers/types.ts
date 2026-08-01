// Providers are deliberately dumb: they receive one finished prompt and return image bytes.
// Prompt authorship lives upstream (ChatGPT via lib/promptsmith, or lib/prompt fallbacks) so
// swapping an image provider never changes what gets painted.
export interface ImageRequest { prompt: string }
export interface ImageProvider { name: string; generateImage(req: ImageRequest): Promise<Uint8Array> }
