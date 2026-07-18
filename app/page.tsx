'use client'
import { useState } from 'react'
import { paletteFor, type ArcBeat } from '@/lib/emotion'
import { getSessionId } from '@/lib/session'
import JournalScreen from '@/components/JournalScreen'
import ArcConfirm from '@/components/ArcConfirm'

type Phase = 'journal' | 'confirm' | 'dissolve' | 'reveal' | 'museum' | 'crisis' | 'resting'
const MIN_DISSOLVE_MS = 8000

// painting shape mirrors /api/paint row; local fallback built client-side when even 'solo' can't reach us
function localPainting(beats: ArcBeat[]) {
  return {
    id: 'local-' + Date.now(), arc_words: beats.map(b => b.word),
    emotion_vec: [], valence: 0, arousal: 0.5,
    panel_urls: ['', '', ''], palette: beats.map(b => paletteFor(b.emotion)),
    lights: 0, is_seed: false, created_at: new Date().toISOString(), mine: true, local: true,
  }
}

function ResourceCard() {
  return (
    <section style={{ maxWidth: 480, margin: '24vh auto 0', padding: '0 1.2rem', textAlign: 'center' }}>
      <p style={{ fontSize: '1.3rem', marginBottom: '1.2rem' }}>you matter · you are not alone</p>
      <p className="plaque" style={{ marginBottom: '1.6rem' }}>
        it sounds like today was heavier than a painting can hold.<br />someone kind is a call away.
      </p>
      <p style={{ lineHeight: 2 }}>
        iCall — <a href="tel:+919152987821" style={{ color: 'var(--accent)' }}>+91 91529 87821</a><br />
        AASRA — <a href="tel:+919820466726" style={{ color: 'var(--accent)' }}>+91 98204 66726</a><br />
        <a href="https://findahelpline.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>findahelpline.com</a>
      </p>
    </section>
  )
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>('journal')
  const [beats, setBeats] = useState<ArcBeat[]>([])
  const [rawText, setRawText] = useState('')
  const [painting, setPainting] = useState<Record<string, unknown> | null>(null)

  async function handleConfirm(edited: ArcBeat[]) {
    setBeats(edited)
    const promise = fetch('/api/paint', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': getSessionId() },
      body: JSON.stringify({ beats: edited }),
    }).then(r => r.json()).catch(() => null)
    setPhase('dissolve')
    const [res] = await Promise.all([promise, new Promise(r => setTimeout(r, MIN_DISSOLVE_MS))])
    if (res?.status === 'limited') { setPhase('resting'); return }   // gentle copy reused; no error UI ever
    if (res?.status === 'resting') { setPhase('resting'); return }
    const p = res?.painting ?? localPainting(edited)
    setPainting(p)
    setPhase('reveal')
  }

  if (phase === 'journal') return (
    <main>
      <JournalScreen
        onArc={(b, t) => { setBeats(b); setRawText(t); setPhase('confirm') }}
        onCrisis={() => setPhase('crisis')}
        onResting={() => setPhase('resting')}
      />
    </main>
  )
  if (phase === 'confirm') return <main><ArcConfirm beats={beats} onConfirm={handleConfirm} /></main>
  if (phase === 'dissolve') return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
      <p className="plaque">the paint is drying…</p>
    </main>
  )
  if (phase === 'reveal' && painting) return (
    <main style={{ maxWidth: 900, margin: '10vh auto 0', padding: '0 1.2rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {[0, 1, 2].map(i => (
          <figure key={i} style={{ width: 'min(260px, 80vw)' }}>
            <div style={{ aspectRatio: '1', border: '10px solid #2a241c', background: (painting.palette as string[][])[i]?.[0] ?? '#12100d' }}>
              {(painting.panel_urls as string[])[i] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(painting.panel_urls as string[])[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}
            </div>
            <figcaption className="plaque" style={{ marginTop: '.5rem' }}>{(painting.arc_words as string[])[i]}</figcaption>
          </figure>
        ))}
      </div>
      <button onClick={() => setPhase('museum')}
        style={{ marginTop: '2.4rem', background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '.6rem 1.8rem' }}>
        hang it in the museum
      </button>
    </main>
  )
  if (phase === 'museum') return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', textAlign: 'center' }}>
      <div>
        <p className="plaque" style={{ marginBottom: '1.2rem' }}>your painting is finding its wall…</p>
        <a href="/museum" style={{ color: 'var(--accent)' }}>walk the halls →</a>
      </div>
    </main>
  )
  if (phase === 'crisis') return <main><ResourceCard /></main>
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', textAlign: 'center' }}>
      <div>
        <p className="plaque" style={{ marginBottom: '1.2rem' }}>the museum is resting tonight — walk the halls instead</p>
        <a href="/museum" style={{ color: 'var(--accent)' }}>enter the museum →</a>
      </div>
    </main>
  )
}
