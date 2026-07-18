'use client'
import { useEffect, useRef } from 'react'
import { paletteFor, type ArcBeat } from '@/lib/emotion'

interface Letter {
  x: number; y: number; vx: number; vy: number
  char: string; color: string; rect: number; delay: number; alpha: number
}

const HOLD_MS = 1500
const FADE_MS = 600
const WRAP_CH = 34

export default function DissolveCanvas({ text, beats, minMs = 8000, done, onFinished }: {
  text: string; beats: ArcBeat[]; minMs?: number; done: boolean; onFinished: () => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(done); doneRef.current = done
  const onFinishedRef = useRef(onFinished); onFinishedRef.current = onFinished

  useEffect(() => {
    const finishedOnce = { fired: false }
    const finish = () => { if (!finishedOnce.fired) { finishedOnce.fired = true; onFinishedRef.current() } }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const start = performance.now()
      const timer = setInterval(() => {
        if (performance.now() - start >= minMs && doneRef.current) { clearInterval(timer); finish() }
      }, 200)
      return () => clearInterval(timer)
    }

    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const vw = window.innerWidth, vh = window.innerHeight
    canvas.width = vw * dpr; canvas.height = vh * dpr
    ctx.scale(dpr, dpr)

    // wrap text and capture per-letter positions
    ctx.font = '24px Georgia, serif'
    const words = text.split(/\s+/).filter(Boolean)
    const lines: string[] = []
    let line = ''
    for (const w of words) {
      if ((line + ' ' + w).trim().length > WRAP_CH) { lines.push(line.trim()); line = w }
      else line = (line + ' ' + w).trim()
    }
    if (line) lines.push(line)

    const letters: Letter[] = []
    const lineH = 38, blockTop = vh * 0.18
    let idx = 0
    const total = lines.join('').replace(/ /g, '').length || 1
    lines.forEach((ln, li) => {
      const lineW = ctx.measureText(ln).width
      let x = (vw - lineW) / 2
      for (const char of ln) {
        const w = ctx.measureText(char).width
        if (char !== ' ') {
          const beat = beats[Math.min(2, Math.floor((3 * idx) / total))]
          letters.push({
            x, y: blockTop + li * lineH, vx: 0, vy: 0, char,
            color: paletteFor(beat.emotion)[0], rect: Math.min(2, Math.floor((3 * idx) / total)),
            delay: HOLD_MS + (idx / total) * 2500, alpha: 1,
          })
          idx++
        }
        x += w
      }
    })

    // three panel silhouettes, lower third
    const pw = Math.min(150, vw * 0.22), gap = pw * 0.25
    const rowW = pw * 3 + gap * 2
    const rects = [0, 1, 2].map(i => ({ x: (vw - rowW) / 2 + i * (pw + gap), y: vh * 0.58, w: pw, h: pw }))

    let raf = 0
    const start = performance.now()
    let fadeStart = 0

    const tick = (now: number) => {
      const t = now - start
      ctx.fillStyle = '#0e0d0b'; ctx.fillRect(0, 0, vw, vh)
      ctx.strokeStyle = '#2a241c'
      rects.forEach(r => ctx.strokeRect(r.x, r.y, r.w, r.h))

      const fading = fadeStart > 0
      const globalAlpha = fading ? Math.max(0, 1 - (now - fadeStart) / FADE_MS) : 1

      for (const p of letters) {
        if (t < p.delay) {
          ctx.globalAlpha = globalAlpha
          ctx.fillStyle = '#e8e2d6'; ctx.font = '24px Georgia, serif'
          ctx.fillText(p.char, p.x, p.y)
          continue
        }
        const r = rects[p.rect]
        const tx = r.x + r.w / 2, ty = r.y + r.h / 2
        const inside = p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h
        if (inside) {                       // slow orbit around panel centre
          const ang = Math.atan2(p.y - ty, p.x - tx) + 0.02
          const rad = Math.hypot(p.x - tx, p.y - ty)
          p.x = tx + Math.cos(ang) * rad; p.y = ty + Math.sin(ang) * rad
        } else {
          p.vx += (tx - p.x) * 0.0022 + (Math.random() - 0.5) * 0.35
          p.vy += (ty - p.y) * 0.0022 + (Math.random() - 0.5) * 0.35
          p.vx *= 0.94; p.vy *= 0.94
          p.x += p.vx; p.y += p.vy
        }
        ctx.globalAlpha = globalAlpha * 0.85
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, 2.5, 2.5)
      }
      ctx.globalAlpha = 1

      if (!fading && t >= minMs && doneRef.current) fadeStart = now
      if (fading && now - fadeStart >= FADE_MS) { finish(); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}><p className="plaque">the paint is drying…</p></main>
  }
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }} />
}
