'use client'
import { useEffect, useState } from 'react'
import MuseumScene from '@/components/museum/MuseumScene'
import FlatGallery from '@/components/museum/FlatGallery'
import MuseumHud from '@/components/museum/MuseumHud'
import { hasWebGL } from '@/lib/webgl'
import type { Night } from '@/lib/environments'
import { loadMood, ambienceFor } from '@/lib/mood'

export default function MuseumPage() {
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const [night, setNight] = useState<Night | null>(null)
  const [motto, setMotto] = useState<string | null>(null)
  useEffect(() => {
    setWebgl(hasWebGL()); setMotto(ambienceFor(loadMood()).motto)
    // walking in nudges the communal canvas awake if it has gone stale — fire-and-forget
    fetch('/api/community', { method: 'POST' }).catch(() => {})
  }, [])
  if (webgl === null) return <main />
  return (
    <main>
      {webgl ? <MuseumScene onNight={setNight} /> : <FlatGallery />}
      <div style={{ position: 'fixed', top: '1.1rem', left: '1.3rem', zIndex: 3 }}>
        <a href="/" className="arch-note" style={{ color: 'var(--dim)' }}>← Write About Your Day</a>
      </div>
      <div style={{ position: 'fixed', top: '1.1rem', right: '1.3rem', zIndex: 3 }}>
        <a href="/about" className="arch-note" style={{ color: 'var(--dim)' }}>About</a>
      </div>
      <span className="arch-note arch-note--faint" style={{ position: 'fixed', bottom: '1.1rem', left: '1.3rem', zIndex: 3, pointerEvents: 'none' }} aria-hidden>
        {night ? `Tonight: ${night.name} — ${motto ?? night.motto}` : 'Hall of the Same Feeling · Wing II'} · fol. 4
      </span>
      {webgl && <MuseumHud />}
    </main>
  )
}
