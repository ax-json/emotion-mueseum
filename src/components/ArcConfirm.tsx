'use client'
import { useEffect, useState } from 'react'
import { animate, stagger } from 'animejs'
import { createDrawable } from 'animejs/svg'
import { EMOTIONS, type ArcBeat, type Emotion, paletteFor } from '@/lib/emotion'
import { prefersReduced } from '@/lib/motion-gate'

const NUMERALS = ['I.', 'II.', 'III.']

/* The AI's reading presented as a registrar's provisional catalog entry: each beat is a
   numbered line, and a curator's pencil circles the read emotion by hand. Reduced motion
   shows the circles pre-drawn — the finished state, never the empty one. */
export default function ArcConfirm({ beats, onConfirm }: { beats: ArcBeat[]; onConfirm: (b: ArcBeat[]) => void }) {
  const [edit, setEdit] = useState<ArcBeat[]>(beats)
  const set = (i: number, emotion: Emotion) => setEdit(e => e.map((b, j) => (j === i ? { ...b, emotion } : b)))

  useEffect(() => {
    if (prefersReduced()) return
    animate(createDrawable('.scribble path'), {
      draw: ['0 0', '0 1'], duration: 900, delay: stagger(380, { start: 600 }), ease: 'inOut(2)',
    })
  }, [])

  return (
    <section style={{ maxWidth: 560, margin: '20vh auto 0', padding: '0 1.2rem', textAlign: 'center', position: 'relative', zIndex: 2 }}>
      <p className="reveal arch-note arch-note--accent">Provisional reading — correct us</p>
      <p className="plaque reveal" style={{ margin: '.6rem 0 1.6rem' }}>We heard:</p>
      <div className="stagger" style={{ display: 'flex', gap: '1.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {edit.map((b, i) => (
          <label key={i} className="beat-entry">
            <span className="arch-note arch-note--faint">{NUMERALS[i] ?? `${i + 1}.`}</span>
            {/* the word takes on the colour of whatever emotion you settle on — the edit is visible */}
            <span className="beat-word" style={{ color: paletteFor(b.emotion)[0], transition: 'color var(--t-mid) var(--ease-soft)' }}>
              {b.word}
              <svg className="scribble" viewBox="0 0 120 44" aria-hidden>
                <path d="M8 24 C 18 6, 94 3, 110 19 C 118 33, 34 43, 12 33 C 4 28, 10 22, 22 20"
                  fill="none" stroke="rgba(141,133,120,.55)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </span>
            <select value={b.emotion} onChange={e => set(i, e.target.value as Emotion)}
              style={{ background: 'var(--bg)', color: 'var(--dim)', border: '1px solid var(--line)', padding: '.3rem' }}>
              {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
        ))}
      </div>
      <button onClick={() => onConfirm(edit)} className="cta reveal delay-3"
        style={{ marginTop: '2.2rem', background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '.55rem 1.6rem' }}>
        Yes, that was my day
      </button>
    </section>
  )
}
