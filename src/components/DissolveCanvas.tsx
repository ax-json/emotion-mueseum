'use client'
import { useEffect, useRef } from 'react'
import { paletteFor, type ArcBeat } from '@/lib/emotion'

/* The letting-go: while the museum paints, the visitor's words dissolve into pigment and
   spiral into ONE waiting canvas through a small weather system of light — breathing halo,
   aurora ribbons in the evening's own palette, rising embers, two glints circling the frame.
   Every glow layer rides a translucent clear, so motion leaves comet trails for free; no
   shadowBlur, no filters — sprites are pre-rendered once and stamped. */

interface Letter {
  x: number; y: number; vx: number; vy: number
  char: string; color: string; delay: number
}

const HOLD_MS = 1500
const FADE_MS = 900
const WRAP_CH = 34
const LETTER_FONT = '24px Georgia, serif'
const STATUS_FONT = 'italic 15px Georgia, serif'
const INK = '#e8e2d6'
const BG = '#0e0d0b'
const TRAIL_ALPHA = 0.16                 // lower = longer comet tails
const DUST_PX = 2.6
const EMBER_COUNT = 42
const SPIRAL_PULL = 0.0016
const SPIRAL_SWIRL = 0.0011

function softSprite(size: number, stops: [number, string][]) {
  const c = document.createElement('canvas'); c.width = c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [at, color] of stops) g.addColorStop(at, color)
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size)
  return c
}

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

    // ------- the one waiting canvas, centre stage -------
    const fw = Math.min(vw * 0.5, vh * 0.42, 400)
    const fx = (vw - fw) / 2, fy = vh * 0.60 - fw / 2
    const cx = fx + fw / 2, cy = fy + fw / 2

    // ------- pre-rendered glow sprites -------
    const halo = softSprite(256, [[0, 'rgba(255,214,150,0.45)'], [0.5, 'rgba(255,214,150,0.12)'], [1, 'rgba(255,214,150,0)']])
    const glint = softSprite(48, [[0, 'rgba(255,240,214,0.95)'], [0.35, 'rgba(255,205,130,0.45)'], [1, 'rgba(255,205,130,0)']])

    // ------- wrap text and capture per-letter positions -------
    ctx.font = LETTER_FONT          // measuring and drawing must use the same font or letters drift
    const words = text.split(/\s+/).filter(Boolean)
    const lines: string[] = []
    let line = ''
    for (const w of words) {
      if ((line + ' ' + w).trim().length > WRAP_CH) { lines.push(line.trim()); line = w }
      else line = (line + ' ' + w).trim()
    }
    if (line) lines.push(line)

    const letters: Letter[] = []
    const lineH = 38, blockTop = vh * 0.14
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
            color: paletteFor(beat.emotion)[0],
            delay: HOLD_MS + (idx / total) * 2500,
          })
          idx++
        }
        x += w
      }
    })

    // ------- the weather: ribbons, embers, orbiting glints -------
    const ribbons = beats.map((b, i) => ({
      color: paletteFor(b.emotion)[0],
      amp: 24 + i * 12, width: 24 - i * 6,
      speed: (0.00030 + i * 0.00013) * (i % 2 ? -1 : 1),
      yBase: fy + fw * (0.18 + i * 0.32), phase: i * 2.1,
    }))
    const emberRnd = () => ({
      x: Math.random() * vw, y: vh * (0.5 + Math.random() * 0.5),
      vy: 0.18 + Math.random() * 0.5, sway: Math.random() * Math.PI * 2,
      size: 8 + Math.random() * 16, color: paletteFor(beats[Math.floor(Math.random() * 3)].emotion)[1],
      life: 0.4 + Math.random() * 0.6,
    })
    const embers = Array.from({ length: EMBER_COUNT }, emberRnd)

    let raf = 0
    const start = performance.now()
    let fadeStart = 0
    let first = true

    const tick = (now: number) => {
      const t = now - start

      // translucent clear → everything that moves leaves a fading trail
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.fillStyle = first ? BG : `rgba(14,13,11,${TRAIL_ALPHA})`
      ctx.fillRect(0, 0, vw, vh)
      first = false

      // breathing halo behind the canvas
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.10 + 0.05 * Math.sin(t / 1400)
      const hs = fw * 2.6
      ctx.drawImage(halo, cx - hs / 2, cy - hs / 2, hs, hs)

      // aurora ribbons in the evening's palette, drifting behind the frame
      for (const r of ribbons) {
        ctx.strokeStyle = r.color
        ctx.lineWidth = r.width
        ctx.globalAlpha = 0.055
        ctx.beginPath()
        let moved = false
        for (let x = fx - fw * 0.45; x <= fx + fw * 1.45; x += 22) {
          const y = r.yBase + Math.sin(x * 0.008 + t * r.speed * 6 + r.phase) * r.amp
          if (moved) ctx.lineTo(x, y); else { ctx.moveTo(x, y); moved = true }
        }
        ctx.stroke()
      }

      // embers rising through the dark
      for (const e of embers) {
        e.y -= e.vy; e.x += Math.sin(t * 0.001 + e.sway) * 0.35; e.life -= 0.0016
        if (e.y < vh * 0.18 || e.life <= 0) Object.assign(e, emberRnd(), { y: vh + 10 })
        ctx.globalAlpha = 0.4 * Math.max(0, e.life)
        ctx.drawImage(glint, e.x - e.size / 2, e.y - e.size / 2, e.size, e.size)
      }

      // two glints circling the frame like slow fireflies (trails come free)
      for (const dir of [1, -1]) {
        const a = t * 0.0006 * dir + (dir > 0 ? 0 : Math.PI)
        const gx = cx + Math.cos(a) * fw * 0.66, gy = cy + Math.sin(a) * fw * 0.66
        ctx.globalAlpha = 0.85
        ctx.drawImage(glint, gx - 13, gy - 13, 26, 26)
      }

      // dissolved letters: pigment dust spiralling into the canvas.
      // delay rises with letter index, so the dissolved letters are always a contiguous
      // prefix and the intact ones a contiguous suffix — each pass sets state once.
      let i = 0
      ctx.globalAlpha = 0.9
      for (; i < letters.length && t >= letters[i].delay; i++) {
        const p = letters[i]
        const dx = cx - p.x, dy = cy - p.y
        const inside = p.x > fx && p.x < fx + fw && p.y > fy && p.y < fy + fw
        if (inside) {                       // orbit and sink slowly toward the heart of the canvas
          const ang = Math.atan2(p.y - cy, p.x - cx) + 0.022
          const rad = Math.max(6, Math.hypot(p.x - cx, p.y - cy) * 0.9988)
          p.x = cx + Math.cos(ang) * rad; p.y = cy + Math.sin(ang) * rad
        } else {                            // spiral approach: pulled inward, swirled sideways
          p.vx += dx * SPIRAL_PULL - dy * SPIRAL_SWIRL + (Math.random() - 0.5) * 0.3
          p.vy += dy * SPIRAL_PULL + dx * SPIRAL_SWIRL + (Math.random() - 0.5) * 0.3
          p.vx *= 0.93; p.vy *= 0.93
          p.x += p.vx; p.y += p.vy
        }
        ctx.fillStyle = p.color             // varies per letter; the rest of the state does not
        ctx.fillRect(p.x, p.y, DUST_PX, DUST_PX)
      }

      // intact words and the frame draw crisp, not glowing
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.fillStyle = INK
      ctx.font = LETTER_FONT
      for (; i < letters.length; i++) ctx.fillText(letters[i].char, letters[i].x, letters[i].y)

      // the waiting frame: double gold border with registrar's corner ticks
      ctx.strokeStyle = '#b98a3f'; ctx.lineWidth = 2
      ctx.strokeRect(fx, fy, fw, fw)
      ctx.strokeStyle = 'rgba(201,168,106,0.35)'; ctx.lineWidth = 1
      ctx.strokeRect(fx - 7, fy - 7, fw + 14, fw + 14)
      ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 2
      const corner = 12
      for (const [px, py, sx, sy] of [[fx - 7, fy - 7, 1, 1], [fx + fw + 7, fy - 7, -1, 1], [fx - 7, fy + fw + 7, 1, -1], [fx + fw + 7, fy + fw + 7, -1, -1]] as const) {
        ctx.beginPath(); ctx.moveTo(px + sx * corner, py); ctx.lineTo(px, py); ctx.lineTo(px, py + sy * corner); ctx.stroke()
      }

      // the museum speaks softly while it works
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t / 900)
      ctx.fillStyle = '#c9a86a'
      ctx.font = STATUS_FONT
      ctx.textAlign = 'center'
      ctx.fillText('the museum is painting your evening…', cx, fy + fw + 46)
      ctx.textAlign = 'left'

      // ending: a single veil of night drawn over everything
      const fading = fadeStart > 0
      if (fading) {
        const p = Math.min(1, (now - fadeStart) / FADE_MS)
        ctx.globalAlpha = p
        ctx.fillStyle = BG
        ctx.fillRect(0, 0, vw, vh)
        ctx.globalAlpha = 1
        if (p >= 1) { finish(); return }
      }
      if (!fading && t >= minMs && doneRef.current) fadeStart = now
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
