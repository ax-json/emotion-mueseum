'use client'
import { useEffect, useRef } from 'react'
import { createAnimatable, animate, utils } from 'animejs'

/* Four blurred emotion-hued blobs drift after the cursor at different lags, so the background
   reads as one liquid gradient coming alive under the hand. Transform-only (S-tier), blur is
   paid once per blob by the compositor. anime.js can't see prefers-reduced-motion — guard it. */
/* colours carry the saturation the old parent filter used to add; gradients do the blur.
   Sizes stay conservative — five near-viewport layers at 2x dpr were fill-rate bound. */
const BLOBS = [
  { hue: 'rgba(214,172,96,.5)', size: 36, lag: 520, home: [18, 22] },     // gold
  { hue: 'rgba(122,146,175,.45)', size: 40, lag: 900, home: [78, 30] },   // dusk blue
  { hue: 'rgba(178,72,55,.38)', size: 34, lag: 1400, home: [30, 76] },    // ember
  { hue: 'rgba(90,122,74,.36)', size: 38, lag: 2000, home: [72, 72] },    // moss
  { hue: 'rgba(22,80,64,.44)', size: 44, lag: 2600, home: [12, 88] },     // deep teal night — the cold under the warmth
] as const

export default function LiquidBackground() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return  // stay a still gradient
    const blobs = Array.from(el.children) as HTMLElement[]
    const anims = blobs.map((b, i) =>
      createAnimatable(b, { x: BLOBS[i].lag, y: BLOBS[i].lag, ease: 'out(3)' }))
    const pulses = blobs.map((b, i) =>
      animate(b, { scale: [1, 1.14], duration: 4200 + i * 1100, alternate: true, loop: true, ease: 'inOutSine' }))
    const onMove = (e: PointerEvent) => {
      const cx = e.clientX - window.innerWidth / 2
      const cy = e.clientY - window.innerHeight / 2
      anims.forEach((a, i) => {
        const pull = 0.5 - i * 0.09                    // near blobs chase harder, far ones trail
        a.x(cx * pull)
        a.y(cy * pull)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      pulses.forEach(p => p.cancel())
      anims.forEach(a => a.revert())
      utils.remove(blobs)
    }
  }, [])

  return (
    <div ref={root} className="liquid-bg" aria-hidden>
      {BLOBS.map((b, i) => (
        <div key={i} className="liquid-blob" style={{
          width: `${b.size}vmax`, height: `${b.size}vmax`,
          left: `calc(${b.home[0]}% - ${b.size / 2}vmax)`,
          top: `calc(${b.home[1]}% - ${b.size / 2}vmax)`,
          // closest-side + full-radius fade: the gradient reaches zero before the element edge,
          // so no hard rim shows now that the blur filter is gone
          background: `radial-gradient(closest-side circle, ${b.hue}, transparent 96%)`,
        }} />
      ))}
    </div>
  )
}
