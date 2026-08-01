'use client'
import { useEffect, useRef } from 'react'
import { prefersReduced, finePointer } from '@/lib/motion-gate'

/* The room's fixed depth stack: film grain, drifting dust, and the lantern — a pointer-following
   pool of candlelight. All layers are pointer-events:none; z-order lives in globals.css.
   Dust positions are constants, not random — SSR markup must match the client on hydration. */
const MOTES = [
  { left: 8, delay: -2, dur: 17, size: 2 }, { left: 15, delay: -9, dur: 23, size: 1 },
  { left: 23, delay: -5, dur: 19, size: 2 }, { left: 31, delay: -13, dur: 26, size: 1 },
  { left: 38, delay: -1, dur: 16, size: 2 }, { left: 46, delay: -11, dur: 21, size: 1 },
  { left: 54, delay: -7, dur: 24, size: 2 }, { left: 61, delay: -15, dur: 18, size: 1 },
  { left: 68, delay: -3, dur: 22, size: 2 }, { left: 74, delay: -10, dur: 27, size: 1 },
  { left: 81, delay: -6, dur: 20, size: 2 }, { left: 87, delay: -14, dur: 25, size: 1 },
  { left: 93, delay: -4, dur: 18, size: 2 }, { left: 97, delay: -8, dur: 23, size: 1 },
] as const

const LANTERN_LERP = 0.08

export default function Scenography() {
  const dot = useRef<HTMLDivElement>(null)
  const orb = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!finePointer()) return
    const lerp = prefersReduced() ? 1 : LANTERN_LERP   // reduced: glow present, no trailing drift
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2, x = tx, y = ty
    let raf = 0
    const onMove = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY
      if (dot.current) dot.current.style.transform = `translate(${tx - 2}px, ${ty - 2}px)`
    }
    const loop = () => {
      // transform on a small pre-painted orb: compositor-only. Writing CSS vars into a
      // full-viewport gradient here repainted the whole screen every frame.
      x += (tx - x) * lerp; y += (ty - y) * lerp
      if (orb.current) orb.current.style.transform = `translate(${x}px, ${y}px)`
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) raf = requestAnimationFrame(loop)
      else raf = 0                                     // settled — stop burning frames until the hand moves
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(loop) }
    const onMoveWake = (e: PointerEvent) => { onMove(e); wake() }
    window.addEventListener('pointermove', onMoveWake, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('pointermove', onMoveWake)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div className="grain" aria-hidden />
      <div className="dust" aria-hidden>
        {MOTES.map((m, i) => (
          <i key={i} style={{
            left: `${m.left}%`, width: m.size, height: m.size,
            animationDelay: `${m.delay}s`, animationDuration: `${m.dur}s`,
          }} />
        ))}
      </div>
      <div ref={orb} className="lantern" aria-hidden />
      <div ref={dot} className="cursor-dot" aria-hidden />
    </>
  )
}
