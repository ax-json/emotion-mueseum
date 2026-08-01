'use client'
import { useRef, useState } from 'react'
import { paletteFor, type ArcBeat } from '@/lib/emotion'
import { getSessionId } from '@/lib/session'
import IntroScreen from '@/components/IntroScreen'
import ChoiceScreen from '@/components/ChoiceScreen'
import LiquidBackground from '@/components/LiquidBackground'
import JournalScreen from '@/components/JournalScreen'
import ArcConfirm from '@/components/ArcConfirm'
import DissolveCanvas from '@/components/DissolveCanvas'
import PaintingReveal from '@/components/PaintingReveal'
import MuseumScene from '@/components/museum/MuseumScene'
import FlatGallery from '@/components/museum/FlatGallery'
import MuseumHud from '@/components/museum/MuseumHud'
import ArchiveChrome from '@/components/ArchiveChrome'
import HomeLink from '@/components/HomeLink'
import { hasWebGL } from '@/lib/webgl'
import { saveMood } from '@/lib/mood'

type Phase = 'intro' | 'choose' | 'journal' | 'confirm' | 'dissolve' | 'reveal' | 'museum' | 'crisis' | 'resting'
const MIN_DISSOLVE_MS = 8000
/* the liquid underpainting lives behind every quiet screen; the dissolve and the museum own their own canvases */
const LIQUID_PHASES: Phase[] = ['intro', 'choose', 'journal', 'confirm', 'crisis', 'resting']

/* eslint-disable @typescript-eslint/no-explicit-any */

// painting shape mirrors /api/paint row; local fallback when even 'solo' can't reach us
function localPainting(beats: ArcBeat[]) {
  return {
    id: 'local-' + Date.now(), arc_words: beats.map(b => b.word),
    emotion_vec: [], valence: 0, arousal: 0.5,
    panel_urls: [''], palette: beats.map(b => paletteFor(b.emotion)),
    lights: 0, is_seed: false, created_at: new Date().toISOString(), mine: true, local: true,
  }
}

function ResourceCard() {
  return (
    <section className="stagger" style={{ maxWidth: 480, margin: '24vh auto 0', padding: '0 1.2rem', textAlign: 'center', position: 'relative', zIndex: 2 }}>
      <p style={{ fontSize: '1.3rem', marginBottom: '1.2rem' }}>You matter. You are not alone.</p>
      <p className="plaque" style={{ marginBottom: '1.6rem' }}>
        It sounds like today was heavier than a painting can hold.<br />Someone kind is a call away.
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
  const [phase, setPhase] = useState<Phase>('intro')
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
      body: JSON.stringify({ beats: edited, text: rawText }),
    }).then(r => r.json()).catch(() => null).then(res => {
      paintRes.current = res; setPaintDone(true)
      // a new evening shifts the world's mood — nudge the communal canvas, fire-and-forget
      fetch('/api/community', { method: 'POST' }).catch(() => {})
    })
    setPhase('dissolve')
  }

  /* the way back out of any wing — resets the visit so the register opens fresh */
  function returnToEntrance() {
    paintRes.current = null
    setBeats([]); setRawText(''); setPainting(null); setPaintDone(false)
    setPhase('intro')
  }

  function handleDissolveFinished() {
    const res = paintRes.current
    if (res?.status === 'limited' || res?.status === 'resting') { setPhase('resting'); return }  // no error UI ever
    const p = res?.painting ?? localPainting(beats)
    // the AI's reading of this evening travels with the visitor — the museum's weather bends to it
    saveMood({
      valence: p.valence ?? 0, arousal: p.arousal ?? 0.5,
      tint: p.palette?.[1]?.[0] ?? p.palette?.[0]?.[0] ?? '#c9a86a',
      words: p.arc_words ?? [],
    })
    setPainting(p)
    setPhase('reveal')
  }

  const liquid = LIQUID_PHASES.includes(phase) ? <LiquidBackground /> : null
  const chrome = <ArchiveChrome phase={phase} />
  // the intro IS the entrance; every later wing shows the way back
  const home = phase === 'intro' ? null : <HomeLink onHome={returnToEntrance} />

  if (phase === 'intro') return <main>{liquid}{chrome}<IntroScreen onEnter={() => setPhase('choose')} /></main>
  if (phase === 'choose') return <main>{liquid}{chrome}{home}<ChoiceScreen onJournal={() => setPhase('journal')} /></main>
  if (phase === 'journal') return (
    <main>
      {liquid}
      {chrome}
      {home}
      <JournalScreen
        onArc={(b, t) => { setBeats(b); setRawText(t); setPhase('confirm') }}
        onCrisis={() => setPhase('crisis')}
        onResting={() => setPhase('resting')}
      />
    </main>
  )
  if (phase === 'confirm') return <main>{liquid}{chrome}{home}<ArcConfirm beats={beats} onConfirm={handleConfirm} /></main>
  if (phase === 'dissolve') return (
    <main>
      {chrome}
      {home}
      <DissolveCanvas text={rawText} beats={beats} minMs={MIN_DISSOLVE_MS} done={paintDone} onFinished={handleDissolveFinished} />
    </main>
  )
  if (phase === 'reveal' && painting) return (
    <main>{chrome}{home}<PaintingReveal painting={painting} onEnterMuseum={() => setPhase('museum')} /></main>
  )
  if (phase === 'museum' && painting) {
    const isLocal = String(painting.id).startsWith('local-')
    return (
      <main>
        <div className="museum-enter" style={{ animation: 'fadeInSlow 1.8s ease both' }}>
          {hasWebGL() ? <MuseumScene highlightId={isLocal ? undefined : String(painting.id)} /> : <FlatGallery />}
        </div>
        <div className="triptych-ghost" style={{ position: 'fixed', inset: 0, animation: 'shrinkAway 1.8s ease forwards', pointerEvents: 'none', zIndex: 2 }}>
          <PaintingReveal painting={painting} onEnterMuseum={() => {}} />
        </div>
        {home}
        {hasWebGL() && <MuseumHud raised />}
        <p className="plaque reveal" style={{ position: 'fixed', bottom: '1rem', width: '100%', textAlign: 'center', zIndex: 3, animationDelay: '2s' }}>
          {isLocal ? 'Your painting lives on this device tonight.' : 'Your painting has found its wall.'}
        </p>
      </main>
    )
  }
  if (phase === 'crisis') return <main>{liquid}{chrome}{home}<ResourceCard /></main>
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', textAlign: 'center' }}>
      {liquid}
      {chrome}
      {home}
      <div className="stagger" style={{ position: 'relative', zIndex: 2 }}>
        <p className="plaque" style={{ marginBottom: '1.2rem' }}>The museum is resting tonight — walk the halls instead.</p>
        <a href="/museum" style={{ color: 'var(--accent)', display: 'inline-block' }}>Enter the Museum →</a>
      </div>
    </main>
  )
}
