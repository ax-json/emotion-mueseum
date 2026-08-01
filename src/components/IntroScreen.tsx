'use client'
import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'

const TITLE = 'The Emotion Museum'

/* Letters rise one by one out of the dark; leaving reverses them upward. anime.js drives both
   so entrance and exit share one motion language. Reduced motion skips straight through. */
export default function IntroScreen({ onEnter }: { onEnter: () => void }) {
  const root = useRef<HTMLElement>(null)
  const vid = useRef<HTMLVideoElement>(null)
  const [leaving, setLeaving] = useState(false)

  /* video autoplay sits outside the CSS reduced-motion net; pause it there explicitly */
  useEffect(() => {
    const v = vid.current
    if (!v) return
    v.muted = true  // React can drop the muted attribute in SSR markup; the property is what autoplay checks
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) v.pause()
  }, [])

  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    animate(el.querySelectorAll('.intro-letter'), {
      opacity: [0, 1], y: ['0.6em', '0em'], rotate: ['6deg', '0deg'],
      // chars develop like a photographic print: overbright blur sharpening into ink
      filter: ['blur(14px) brightness(2.2)', 'blur(0px) brightness(1)'],
      duration: 1400, delay: stagger(42, { start: 300 }), ease: 'out(4)',
    })
    animate(el.querySelectorAll('.intro-rest'), {
      opacity: [0, 1], y: [14, 0], duration: 900, delay: stagger(180, { start: 1300 }), ease: 'out(3)',
    })
  }, [])

  function leave() {
    if (leaving) return
    setLeaving(true)
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onEnter()
    animate(el.querySelectorAll('.intro-letter'), {
      opacity: 0, y: '-0.7em', duration: 600, delay: stagger(18), ease: 'in(3)',
    })
    animate(el.querySelectorAll('.intro-rest'), {
      opacity: 0, y: -10, duration: 450, ease: 'in(2)', onComplete: onEnter,
    })
  }

  return (
    <section ref={root} className="intro-screen" onClick={leave}>
      <video ref={vid} className="soul-overlay" src="/soul-overlay.mp4" autoPlay muted loop playsInline aria-hidden />
      <i className="light-smear" style={{ '--tilt': '-14deg', '--dur': '26s', top: '24%' } as React.CSSProperties} aria-hidden />
      <i className="light-smear" style={{ '--tilt': '9deg', '--dur': '34s', top: '68%', opacity: .18 } as React.CSSProperties} aria-hidden />
      <h1 className="title-display" aria-label={TITLE}>
        {TITLE.split('').map((ch, i) =>
          ch === ' '
            ? <span key={i} className="intro-space" />
            : <span key={i} className="intro-letter" aria-hidden>{ch}</span>)}
      </h1>
      <p className="intro-rest intro-sub plaque">Your day, hung among strangers who felt the same.</p>
      <button className="intro-rest intro-cta cta" onClick={leave} disabled={leaving}>
        Step Inside
      </button>
    </section>
  )
}
