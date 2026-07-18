import type { Emotion } from '@/lib/emotion'

export interface PanelRequest { arcWord: string; emotion: Emotion; intensity: number; palette: string[] }
export interface ImageProvider { name: string; generatePanel(req: PanelRequest): Promise<Uint8Array> }

export function panelPrompt(req: PanelRequest): string {
  const strength = req.intensity > 0.66 ? 'intense, saturated' : req.intensity > 0.33 ? 'present, breathing' : 'faint, receding'
  return [
    `Abstract expressionist painting of the feeling "${req.arcWord}" (${req.emotion}), ${strength}.`,
    `Strictly limited palette: ${req.palette.join(', ')} on a deep charcoal ground.`,
    `Thick impasto and dry-brush gouache texture, visible canvas grain, physical paint.`,
    `No text, no letters, no numbers. No faces, no figures — faceless abstraction only.`,
    `Museum-quality single cohesive composition, moody low-key gallery lighting.`,
  ].join(' ')
}
