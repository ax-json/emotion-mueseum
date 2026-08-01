'use client'
import { useEffect, useRef, useState } from 'react'
import { browserDb } from '@/lib/supabase'
import ParticlePanel from '@/components/ParticlePanel'
import { seedFrom } from '@/components/particle-draw'
import { COMMUNITY_SESSION } from '@/lib/community'
import type { PaintingRow } from './GalleryRoom'

function Panels({ p, size }: { p: PaintingRow; size: number }) {
  const urls = p.panel_urls?.length ? p.panel_urls.slice(0, 3) : ['']
  const solo = urls.length === 1
  return (
    <div style={{ display: 'flex', gap: 2, border: '8px solid var(--frame)', background: '#12100d' }}>
      {urls.map((u, i) => (
        <div key={i} style={{ flex: 1, aspectRatio: '1' }}>
          {u
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <ParticlePanel
                palette={solo ? ((p.palette ?? []).flat().length ? (p.palette ?? []).flat() : ['#4a5d73', '#7d8fa3', '#2c3644']) : (p.palette[i] ?? ['#4a5d73', '#7d8fa3', '#2c3644'])}
                arousal={p.arousal} seed={seedFrom(p.id, i)} size={size} />}
        </div>
      ))}
    </div>
  )
}

export default function FlatGallery() {
  const [paintings, setPaintings] = useState<PaintingRow[]>([])
  const [community, setCommunity] = useState<PaintingRow | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let alive = true
    const db = browserDb()
    db.from('paintings').select('*').neq('session_hash', COMMUNITY_SESSION)
      .order('created_at', { ascending: false }).limit(120)
      .then(({ data }) => { if (alive && data) setPaintings([...data].sort((a, b) => a.valence - b.valence)) })
    db.from('paintings').select('*').eq('session_hash', COMMUNITY_SESSION)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (alive && data?.[0]) setCommunity(data[0]) })
    return () => { alive = false }
  }, [])

  // Paintings arrive as you walk the room rather than all at once. One observer for the whole grid,
  // and each frame is unobserved the moment it lands — no scroll listener, no per-card observer.
  useEffect(() => {
    const root = grid.current
    if (!root || !paintings.length) return
    const frames = root.querySelectorAll('[data-reveal]')
    // no observer support => show everything rather than leave a wall of invisible frames
    if (typeof IntersectionObserver === 'undefined') {
      frames.forEach(el => el.classList.add('reveal'))
      return
    }
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('reveal')
        io.unobserve(e.target)
      }
    }, { rootMargin: '0px 0px -8% 0px' })
    frames.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [paintings])
  return (
    <section style={{ maxWidth: 1100, margin: '8vh auto', padding: '0 1.2rem' }}>
      <h1 className="reveal" style={{ marginBottom: '2rem', textAlign: 'center' }}>The Museum, Flattened for Tonight</h1>
      {community && (
        /* the communal canvas leads the room, way larger than any single evening */
        <figure className="frame reveal" style={{ maxWidth: 560, margin: '0 auto 3.2rem', boxShadow: '0 0 90px rgba(255,214,150,0.14)' }}>
          <Panels p={community} size={560} />
          <figcaption className="plaque" style={{ marginTop: '.6rem', textAlign: 'center' }}>
            the world tonight · painted from every evening hung here · {community.arc_words.join(' · ')}
          </figcaption>
        </figure>
      )}
      <div ref={grid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.6rem' }}>
        {paintings.map(p => (
          <figure key={p.id} data-reveal className="frame" style={{ opacity: 0 }}>
            <Panels p={p} size={160} />
            <figcaption className="plaque" style={{ marginTop: '.4rem', fontSize: '.85rem' }}>
              {p.is_seed ? 'founding collection · ' : ''}{p.arc_words.join(' · ')}
              {p.lights > 0 ? ` · ✦ ${p.lights}` : ''}
            </figcaption>
          </figure>
        ))}
      </div>
      {paintings.length === 0 && <p className="plaque" style={{ textAlign: 'center' }}>The walls are waiting for the first day…</p>}
    </section>
  )
}
