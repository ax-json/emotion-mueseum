'use client'
import { useRef, useState } from 'react'
import { paletteFor, type ArcBeat } from '@/lib/emotion'
import { getSessionId } from '@/lib/session'
import JournalScreen from '@/components/JournalScreen'
import ArcConfirm from '@/components/ArcConfirm'
import DissolveCanvas from '@/components/DissolveCanvas'
import TriptychReveal from '@/components/TriptychReveal'
import MuseumScene from '@/components/museum/MuseumScene'
import FlatGallery from '@/components/museum/FlatGallery'
import { hasWebGL } from '@/lib/webgl'

type Phase = 'journal' | 'confirm' | 'dissolve' | 'reveal' | 'museum' | 'crisis' | 'resting'
const MIN_DISSOLVE_MS = 8000

/* eslint-disable @typescript-eslint/no-explicit-any */

// painting shape mirrors /api/paint row; local fallback when even 'solo' can't reach us
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
  const [painting, setPainting] = useState<any>(null)
  const [paintDone, setPaintDone] = useState(false)
  const paintRes = useRef<any>(null)

  function handleConfirm(edited: ArcBeat[]) {
    setBeats(edited)
    setPaintDone(false)
    fetch('/api/paint', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': getSessionId() },
      body: JSON.stringify({ beats: edited }),
    }).then(r => r.json()).catch(() => null).then(res => { paintRes.current = res; setPaintDone(true) })
    setPhase('dissolve')
  }

  function handleDissolveFinished() {
    const res = paintRes.current
    if (res?.status === 'limited' || res?.status === 'resting') { setPhase('resting'); return }  // no error UI ever
    setPainting(res?.painting ?? localPainting(beats))
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
    <main>
      <DissolveCanvas text={rawText} beats={beats} minMs={MIN_DISSOLVE_MS} done={paintDone} onFinished={handleDissolveFinished} />
    </main>
  )
  if (phase === 'reveal' && painting) return (
    <main><TriptychReveal painting={painting} onEnterMuseum={() => setPhase('museum')} /></main>
  )
  if (phase === 'museum' && painting) {
    const isLocal = String(painting.id).startsWith('local-')
    return (
      <main>
        <div className="museum-enter" style={{ animation: 'fadeInSlow 1.8s ease both' }}>
          {hasWebGL() ? <MuseumScene highlightId={isLocal ? undefined : String(painting.id)} /> : <FlatGallery />}
        </div>
        <div className="triptych-ghost" style={{ position: 'fixed', inset: 0, animation: 'shrinkAway 1.8s ease forwards', pointerEvents: 'none', zIndex: 2 }}>
          <TriptychReveal painting={painting} onEnterMuseum={() => {}} />
        </div>
        <p className="plaque" style={{ position: 'fixed', bottom: '1rem', width: '100%', textAlign: 'center', zIndex: 2 }}>
          {isLocal ? 'your painting lives on this device tonight' : 'your painting has found its wall'}
        </p>
      </main>
    )
  }
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
