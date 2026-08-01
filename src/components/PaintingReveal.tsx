'use client'
import ParticlePanel from './ParticlePanel'
import { seedFrom } from './particle-draw'
import { accessionOf, creditLineOf } from '@/lib/accession'

/* eslint-disable @typescript-eslint/no-explicit-any */

/* One evening, one canvas. The frame rises, then the painting is unveiled bottom-to-top
   like a dust sheet coming off. (Succeeds the old three-panel TriptychReveal.) */
export default function PaintingReveal({ painting, onEnterMuseum }: { painting: any; onEnterMuseum: () => void }) {
  const url = painting.panel_urls?.[0] ?? ''
  // legacy triptych fallback palettes merge into one richer field for the particle canvas
  const mergedPalette: string[] = (painting.palette ?? []).flat()
  return (
    <section style={{ maxWidth: 900, margin: '8vh auto 0', padding: '0 1.2rem', textAlign: 'center', position: 'relative', zIndex: 2 }}>
      <figure className="frame" style={{ width: 'min(440px, 86vw)', margin: '0 auto', animation: 'riseIn 1s var(--ease) both' }}>
        <div className="unveil" style={{ aspectRatio: '1', border: '12px solid var(--frame)', background: '#12100d', animationDelay: '0.45s', boxShadow: 'inset 0 0 60px rgba(0,0,0,.7)' }}>
          {url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <ParticlePanel palette={mergedPalette.length ? mergedPalette : ['#4a5d73', '#7d8fa3', '#2c3644']} arousal={painting.arousal} seed={seedFrom(String(painting.id), 0)} />}
        </div>
        <figcaption className="plaque" style={{ marginTop: '.6rem' }}>{(painting.arc_words ?? []).join(' · ')}</figcaption>
      </figure>
      <p className="dim-line arch-note arch-note--faint reveal" style={{ animationDelay: '1.6s' }}>
        One canvas · one evening
      </p>
      {/* the acquisition's wall label, in canonical museum field order — accession last */}
      <figure className="wall-label reveal" style={{ animationDelay: '1.8s' }}>
        <p className="arch-note">Anonymous visitor</p>
        <h2 className="wall-label-title">{(painting.arc_words ?? []).join(', ')}</h2>
        <p className="wall-label-medium">Dissolved words, pigment and light on canvas</p>
        <p className="arch-note arch-note--faint">{creditLineOf(painting)}</p>
        <p className="arch-note arch-note--accent wall-label-acc">{accessionOf(painting)} · The Night Collection</p>
        <span className="stamp" aria-hidden>Received · the night collection</span>
      </figure>
      <button onClick={onEnterMuseum} className="cta reveal"
        style={{ marginTop: '2.4rem', background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '.6rem 1.8rem', animationDelay: '2s' }}>
        Hang it in the Museum
      </button>
    </section>
  )
}
