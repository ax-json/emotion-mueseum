'use client'
import { useEffect, useState } from 'react'
import { browserDb } from '@/lib/supabase'
import ParticlePanel from '@/components/ParticlePanel'
import { seedFrom } from '@/components/particle-draw'
import type { PaintingRow } from './GalleryRoom'

export default function FlatGallery() {
  const [paintings, setPaintings] = useState<PaintingRow[]>([])
  useEffect(() => {
    let alive = true
    browserDb().from('paintings').select('*').order('created_at', { ascending: false }).limit(120)
      .then(({ data }) => { if (alive && data) setPaintings([...data].sort((a, b) => a.valence - b.valence)) })
    return () => { alive = false }
  }, [])
  return (
    <section style={{ maxWidth: 1100, margin: '8vh auto', padding: '0 1.2rem' }}>
      <h1 style={{ fontWeight: 400, marginBottom: '2rem', textAlign: 'center' }}>the museum, flattened for tonight</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.6rem' }}>
        {paintings.map(p => (
          <figure key={p.id} style={{ animation: 'fadeIn .6s ease both' }}>
            <div style={{ display: 'flex', gap: 2, border: '8px solid #2a241c', background: '#12100d' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ flex: 1, aspectRatio: '1' }}>
                  {p.panel_urls[i]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.panel_urls[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <ParticlePanel palette={p.palette[i] ?? ['#4a5d73', '#7d8fa3', '#2c3644']} arousal={p.arousal} seed={seedFrom(p.id, i)} size={160} />}
                </div>
              ))}
            </div>
            <figcaption className="plaque" style={{ marginTop: '.4rem', fontSize: '.85rem' }}>
              {p.is_seed ? 'founding collection · ' : ''}{p.arc_words.join(' · ')}
              {p.lights > 0 ? ` · ✦ ${p.lights}` : ''}
            </figcaption>
          </figure>
        ))}
      </div>
      {paintings.length === 0 && <p className="plaque" style={{ textAlign: 'center' }}>the walls are waiting for the first day…</p>}
    </section>
  )
}
