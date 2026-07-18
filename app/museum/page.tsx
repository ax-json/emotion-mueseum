'use client'
import { useEffect, useState } from 'react'
import MuseumScene from '@/components/museum/MuseumScene'
import FlatGallery from '@/components/museum/FlatGallery'
import { hasWebGL } from '@/lib/webgl'

export default function MuseumPage() {
  const [webgl, setWebgl] = useState<boolean | null>(null)
  useEffect(() => { setWebgl(hasWebGL()) }, [])
  if (webgl === null) return <main />
  return (
    <main>
      {webgl ? <MuseumScene /> : <FlatGallery />}
      <div style={{ position: 'fixed', top: '1rem', left: '1.2rem', zIndex: 2 }}>
        <a href="/" style={{ color: 'var(--dim)', textDecoration: 'none' }}>← tell the museum about your day</a>
      </div>
      <div style={{ position: 'fixed', top: '1rem', right: '1.2rem', zIndex: 2 }}>
        <a href="/about" style={{ color: 'var(--dim)', textDecoration: 'none' }}>about</a>
      </div>
    </main>
  )
}
