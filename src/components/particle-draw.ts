// deterministic painterly strokes — shared by ParticlePanel (DOM canvas) and museum CanvasTexture
export function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

export function drawParticlePainting(ctx: CanvasRenderingContext2D, palette: string[], arousal: number, seed: number, size: number) {
  const rnd = mulberry32(seed)
  ctx.fillStyle = '#12100d'; ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 600; i++) {
    ctx.strokeStyle = palette[Math.floor(rnd() * palette.length)] + '55'
    ctx.lineWidth = 1 + rnd() * 6
    const x = rnd() * size, y = rnd() * size, len = 20 + rnd() * 80
    const ang = rnd() * Math.PI * 2 * (0.2 + arousal)
    ctx.beginPath(); ctx.moveTo(x, y)
    ctx.quadraticCurveTo(
      x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5 + (rnd() - 0.5) * 40 * arousal,
      x + Math.cos(ang) * len, y + Math.sin(ang) * len)
    ctx.stroke()
  }
}

export function seedFrom(id: string, i: number) { let h = i + 1; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }
