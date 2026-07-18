'use client'
import MuseumScene from '@/components/museum/MuseumScene'

export default function MuseumPage() {
  return (
    <main>
      <MuseumScene />
      <div style={{ position: 'fixed', top: '1rem', left: '1.2rem', zIndex: 2 }}>
        <a href="/" style={{ color: 'var(--dim)', textDecoration: 'none' }}>← tell the museum about your day</a>
      </div>
      <div style={{ position: 'fixed', top: '1rem', right: '1.2rem', zIndex: 2 }}>
        <a href="/about" style={{ color: 'var(--dim)', textDecoration: 'none' }}>about</a>
      </div>
    </main>
  )
}
