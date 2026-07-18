'use client'
import ParticlePanel from './ParticlePanel'
import { seedFrom } from './particle-draw'

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function TriptychReveal({ painting, onEnterMuseum }: { painting: any; onEnterMuseum: () => void }) {
  return (
    <section style={{ maxWidth: 900, margin: '10vh auto 0', padding: '0 1.2rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {[0, 1, 2].map(i => (
          <figure key={i} style={{ width: 'min(260px, 80vw)', animation: `fadeIn .8s ease ${i * 0.8}s both` }}>
            <div style={{ aspectRatio: '1', border: '10px solid #2a241c', background: '#12100d' }}>
              {painting.panel_urls[i]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={painting.panel_urls[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <ParticlePanel palette={painting.palette[i]} arousal={painting.arousal} seed={seedFrom(String(painting.id), i)} />}
            </div>
            <figcaption className="plaque" style={{ marginTop: '.5rem' }}>{painting.arc_words[i]}</figcaption>
          </figure>
        ))}
      </div>
      <button onClick={onEnterMuseum}
        style={{ marginTop: '2.4rem', background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '.6rem 1.8rem' }}>
        hang it in the museum
      </button>
    </section>
  )
}
