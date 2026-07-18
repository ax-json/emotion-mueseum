'use client'
import { useEffect, useRef } from 'react'
import { drawParticlePainting } from './particle-draw'

export default function ParticlePanel({ palette, arousal, seed = 1, size = 512 }: { palette: string[]; arousal: number; seed?: number; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!
    drawParticlePainting(ctx, palette, arousal, seed, size)
  }, [palette, arousal, seed, size])
  return <canvas ref={ref} width={size} height={size} style={{ width: '100%', height: '100%', display: 'block' }} />
}
