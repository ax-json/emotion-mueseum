'use client'
import { useEffect, useState } from 'react'
import { browserDb } from '@/lib/supabase'
import { wallPosition } from '@/lib/emotion'
import { seedFrom } from '@/components/particle-draw'
import PaintingFrame from './PaintingFrame'
import RailsCamera from './RailsCamera'

export interface PaintingRow {
  id: string; created_at: string; arc_words: string[]; emotion_vec: number[]
  valence: number; arousal: number; panel_urls: string[]; palette: string[][]
  lights: number; is_seed: boolean
}

const MAX_DISPLAYED = 120

export default function GalleryRoom({ highlightId }: { highlightId?: string }) {
  const [paintings, setPaintings] = useState<PaintingRow[]>([])
  const [focus, setFocus] = useState<PaintingRow | null>(null)

  useEffect(() => {
    let alive = true
    const db = browserDb()
    db.from('paintings').select('*').order('created_at', { ascending: false }).limit(MAX_DISPLAYED)
      .then(({ data }) => {
        if (!alive || !data) return
        setPaintings(data)
        if (highlightId) setFocus(data.find(p => p.id === highlightId) ?? null)
      })
    let channel: ReturnType<typeof db.channel> | null = null
    try {
      channel = db.channel('paintings-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'paintings' }, payload => {
          setPaintings(prev => [payload.new as PaintingRow, ...prev].slice(0, MAX_DISPLAYED))
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'paintings' }, payload => {
          const upd = payload.new as PaintingRow
          setPaintings(prev => prev.map(p => (p.id === upd.id ? { ...p, lights: upd.lights } : p)))
        })
        .subscribe()
    } catch { /* realtime unavailable → museum still renders static (spec §7) */ }
    return () => { alive = false; if (channel) db.removeChannel(channel) }
  }, [highlightId])

  const focusTarget = focus
    ? wallPosition(focus.valence, focus.arousal, seedFrom(focus.id, 0))
    : null

  return (
    <group>
      {paintings.map(p => (
        <PaintingFrame key={p.id} painting={p}
          position={wallPosition(p.valence, p.arousal, seedFrom(p.id, 0))}
          isFocused={focus?.id === p.id}
          onFocus={() => setFocus(p)} />
      ))}
      <RailsCamera focusTarget={focusTarget} />
    </group>
  )
}
