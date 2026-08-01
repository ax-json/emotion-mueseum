'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { animate, stagger, createAnimatable, spring } from 'animejs'
import { prefersReduced, finePointer } from '@/lib/motion-gate'

const MAGNET_REACH = 140       // px beyond the card edge where its gravity begins
const MAGNET_PULL = 0.22
const MAGNET_TILT = 0.02

/* Two doors into the museum, hung like taped specimens. Either choice animates the room
   away before the route/phase changes, so the site never hard-cuts. Cards carry real
   gravity: within reach they lean toward the hand, released on a spring. */
export default function ChoiceScreen({ onJournal }: { onJournal: () => void }) {
  const root = useRef<HTMLElement>(null)
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const el = root.current
    if (!el || prefersReduced()) return
    animate(el.querySelectorAll('.choice-in'), {
      opacity: [0, 1], y: [26, 0], duration: 850, delay: stagger(140, { start: 120 }), ease: 'out(4)',
    })
  }, [])

  useEffect(() => {
    const el = root.current
    if (!el || prefersReduced() || !finePointer()) return
    const cards = Array.from(el.querySelectorAll<HTMLElement>('.choice-card'))
    const anims = cards.map(c => createAnimatable(c, { x: 350, y: 350, rotateX: 350, rotateY: 350, ease: 'out(3)' }))
    const settle = spring({ stiffness: 110, damping: 11 })
    const onMove = (e: PointerEvent) => {
      cards.forEach((c, i) => {
        const b = c.getBoundingClientRect()
        const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2)
        const reach = Math.max(b.width, b.height) / 2 + MAGNET_REACH
        const dist = Math.hypot(dx, dy)
        const a = anims[i]
        if (dist < reach) {
          const pull = 1 - dist / reach
          a.x(dx * MAGNET_PULL * pull); a.y(dy * MAGNET_PULL * pull)
          a.rotateY(dx * MAGNET_TILT * pull); a.rotateX(-dy * MAGNET_TILT * pull)
        } else {
          a.x(0, 700, settle); a.y(0, 700, settle)
          a.rotateX(0, 700, settle); a.rotateY(0, 700, settle)
        }
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      anims.forEach(a => a.revert())
    }
  }, [])

  function departTo(after: () => void) {
    if (busy) return
    setBusy(true)
    const el = root.current
    if (!el || prefersReduced()) return after()
    animate(el.querySelectorAll('.choice-in'), {
      opacity: 0, y: -22, scale: 0.97, duration: 520, delay: stagger(70), ease: 'in(3)',
      onComplete: after,
    })
  }

  return (
    <section ref={root} className="choice-screen">
      <p className="choice-in plaque choice-lead">The museum is open. How would you like to enter?</p>
      <div className="choice-cards">
        <button className="choice-in choice-card tape" disabled={busy}
          onClick={() => departTo(() => router.push('/museum'))}>
          <span className="reg-corners" aria-hidden />
          <span className="choice-card-title">Walk the Museum</span>
          <span className="choice-card-sub plaque">Wander tonight&rsquo;s gallery of strangers&rsquo; days.</span>
          <span className="choice-card-go">Enter →</span>
          <span className="arch-note arch-note--faint">Wing II · open to all visitors</span>
        </button>
        <button className="choice-in choice-card choice-card--late tape tape--alt" disabled={busy}
          onClick={() => departTo(onJournal)}>
          <span className="reg-corners" aria-hidden />
          <span className="choice-card-title">Write a Journal Entry</span>
          <span className="choice-card-sub plaque">Let today become a painting on its walls.</span>
          <span className="choice-card-go">Begin →</span>
          <span className="arch-note arch-note--faint">Field notes · three lines, unedited</span>
        </button>
      </div>
    </section>
  )
}
