'use client'
import { useState } from 'react'
import { EMOTIONS, type ArcBeat, type Emotion, paletteFor } from '@/lib/emotion'

export default function ArcConfirm({ beats, onConfirm }: { beats: ArcBeat[]; onConfirm: (b: ArcBeat[]) => void }) {
  const [edit, setEdit] = useState<ArcBeat[]>(beats)
  const set = (i: number, emotion: Emotion) => setEdit(e => e.map((b, j) => (j === i ? { ...b, emotion } : b)))
  return (
    <section style={{ maxWidth: 560, margin: '22vh auto 0', padding: '0 1.2rem', textAlign: 'center' }}>
      <p className="plaque" style={{ marginBottom: '1.6rem' }}>we heard:</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {edit.map((b, i) => (
          <label key={i} style={{ display: 'grid', gap: '.4rem' }}>
            <span style={{ fontSize: '1.3rem', color: paletteFor(b.emotion)[0] }}>{b.word}</span>
            <select value={b.emotion} onChange={e => set(i, e.target.value as Emotion)}
              style={{ background: 'var(--bg)', color: 'var(--dim)', border: '1px solid #2a2822', padding: '.3rem' }}>
              {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
        ))}
      </div>
      <button onClick={() => onConfirm(edit)}
        style={{ marginTop: '2.2rem', background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '.55rem 1.6rem' }}>
        yes, that was my day
      </button>
    </section>
  )
}
