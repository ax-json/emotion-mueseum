'use client'
import { useEffect, useMemo, useState } from 'react'
import { browserDb } from '@/lib/supabase'
import { wallPosition } from '@/lib/emotion'
import { seedFrom, mulberry32 } from '@/components/particle-draw'
import PaintingFrame from './PaintingFrame'
import CommunityPainting from './CommunityPainting'
import FirstPersonRig from './FirstPersonRig'
import MuralWall from './MuralWall'
import { COMMUNITY_SESSION } from '@/lib/community'
import { NIGHTS, type Night } from '@/lib/environments'

export interface PaintingRow {
  id: string; created_at: string; arc_words: string[]; emotion_vec: number[]
  valence: number; arousal: number; panel_urls: string[]; palette: string[][]
  lights: number; is_seed: boolean; session_hash?: string
}

const MAX_DISPLAYED = 120

export default function GalleryRoom({ highlightId, night = NIGHTS[0] }: { highlightId?: string; night?: Night }) {
  const [paintings, setPaintings] = useState<PaintingRow[]>([])
  const [community, setCommunity] = useState<PaintingRow | null>(null)
  const [focus, setFocus] = useState<PaintingRow | null>(null)

  useEffect(() => {
    let alive = true
    const db = browserDb()
    // the communal canvas hangs apart — it never joins the ordinary walls
    db.from('paintings').select('*').neq('session_hash', COMMUNITY_SESSION)
      .order('created_at', { ascending: false }).limit(MAX_DISPLAYED)
      .then(({ data }) => {
        if (!alive || !data) return
        setPaintings(data)
        if (highlightId) setFocus(data.find(p => p.id === highlightId) ?? null)
      })
    db.from('paintings').select('*').eq('session_hash', COMMUNITY_SESSION)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (alive && data?.[0]) setCommunity(data[0]) })
    let channel: ReturnType<typeof db.channel> | null = null
    try {
      channel = db.channel('paintings-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'paintings' }, payload => {
          const row = payload.new as PaintingRow
          if (row.session_hash === COMMUNITY_SESSION) { setCommunity(row); return }
          setPaintings(prev => [row, ...prev].slice(0, MAX_DISPLAYED))
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'paintings' }, payload => {
          const upd = payload.new as PaintingRow
          // the communal canvas regenerates in place — swap the whole row, not just lights
          if (upd.session_hash === COMMUNITY_SESSION) { setCommunity(upd); return }
          setPaintings(prev => prev.map(p => (p.id === upd.id ? { ...p, lights: upd.lights } : p)))
        })
        .subscribe()
    } catch { /* realtime unavailable → museum still renders static (spec §7) */ }
    return () => { alive = false; if (channel) db.removeChannel(channel) }
  }, [highlightId])

  // hanging a painting is deterministic, so clicking one frame must not re-place the other 119.
  // Every frame carries a facing normal (nx, nz): the focus dolly stands 1.6m along it and
  // looks back, so paintings may face any direction — the collection now SURROUNDS the
  // visitor instead of lining one wall. Nothing hangs underfoot or directly overhead:
  // float nights place on a cylinder shell (y-banded), the hall uses its four walls.
  const hung = useMemo(() => {
    if (night.layout === 'float' && night.scatter) {
      // cylinder around the walkable centre — a sky of paintings on all sides
      const sc = night.scatter
      const CX = 0, CZ = 2
      const R_MIN = 3.8, R_MAX = sc.xSpread + 2.4
      const MIN_ARC = 2.3, MIN_DY = 0.95, MIN_DR = 1.4
      const placed: { th: number; y: number; r: number }[] = []
      return paintings.map(p => {
        const rnd = mulberry32(seedFrom(night.id + p.id, 0))
        let th = rnd() * Math.PI * 2
        let y = sc.yMin + rnd() * (sc.yMax - sc.yMin)
        let r = R_MIN + rnd() * (R_MAX - R_MIN)
        let guard = 0
        const collides = () => {
          const x = CX + Math.sin(th) * r, z = CZ + Math.cos(th) * r
          if (Math.abs(x) < 1.7 && z > 4.8 && z < 8.2) return true      // spawn stays clear
          return placed.some(q => {
            const dth = Math.abs(((th - q.th + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
            return dth * ((r + q.r) / 2) < MIN_ARC && Math.abs(q.y - y) < MIN_DY && Math.abs(q.r - r) < MIN_DR
          })
        }
        while (collides() && guard < 90) {
          th = (th + 0.42) % (Math.PI * 2)
          if (guard % 15 === 14) y = y + MIN_DY > sc.yMax ? sc.yMin : y + MIN_DY
          guard++
        }
        placed.push({ th, y, r })
        const x = CX + Math.sin(th) * r, z = CZ + Math.cos(th) * r
        return { p, position: { x, y, z }, rotY: th + Math.PI, normal: { x: -Math.sin(th), z: -Math.cos(th) } }
      })
    }
    // the hall hangs all four walls: back twice-weighted, doorway and mural kept clear
    const WALLS = [
      { id: 'back', rotY: 0, normal: { x: 0, z: 1 } },
      { id: 'back', rotY: 0, normal: { x: 0, z: 1 } },
      { id: 'left', rotY: Math.PI / 2, normal: { x: 1, z: 0 } },
      { id: 'right', rotY: -Math.PI / 2, normal: { x: -1, z: 0 } },
      { id: 'front', rotY: Math.PI, normal: { x: 0, z: -1 } },
    ] as const
    const MIN_DT = 1.75, MIN_DY = 0.85, T_MAX = 6.6, Y_MIN = 1.1, Y_MAX = 2.9
    const SIDE_T_MIN = -3.4, SIDE_T_MAX = 7.9
    const placed: Record<string, { t: number; y: number }[]> = { back: [], left: [], right: [], front: [] }
    const posOf = (wall: (typeof WALLS)[number], t: number, y: number) => {
      if (wall.id === 'back') return { x: t, y, z: -4.9 }
      if (wall.id === 'front') return { x: t, y, z: 9.15 }
      if (wall.id === 'left') return { x: -8.15, y, z: t }
      return { x: 8.15, y, z: t }
    }
    const blocked = (wall: (typeof WALLS)[number], t: number) => {
      if (wall.id === 'front' && Math.abs(t) < 2.1) return true          // the doorway
      if (wall.id === 'left' && t > -3.5 && t < 1.5) return true         // the mural's stretch
      if (wall.id === 'back' && Math.abs(t) < 2.35) return true          // the communal canvas's stage
      return false
    }
    return paintings.map(p => {
      const wall = WALLS[seedFrom(p.id, 3) % WALLS.length]
      const raw = wallPosition(p.valence, p.arousal, seedFrom(p.id, 0))
      const onSide = wall.id === 'left' || wall.id === 'right'
      const tMin = onSide ? SIDE_T_MIN : -T_MAX, tMax = onSide ? SIDE_T_MAX : T_MAX
      let t = onSide ? SIDE_T_MIN + ((raw.x + T_MAX) / (2 * T_MAX)) * (SIDE_T_MAX - SIDE_T_MIN) : raw.x
      let y = raw.y
      let guard = 0
      const bucket = placed[wall.id]
      while ((blocked(wall, t) || bucket.some(q => Math.abs(q.t - t) < MIN_DT && Math.abs(q.y - y) < MIN_DY)) && guard < 60) {
        t += MIN_DT
        if (t > tMax) { t = tMin; y = y + MIN_DY > Y_MAX ? Y_MIN : y + MIN_DY }
        guard++
      }
      bucket.push({ t, y })
      return { p, position: posOf(wall, t, y), rotY: wall.rotY, normal: wall.normal }
    })
  }, [paintings, night])
  const focusTarget = useMemo(() => {
    if (!focus) return null
    const h = hung.find(x => x.p.id === focus.id)
    return h ? { ...h.position, nx: h.normal.x, nz: h.normal.z } : null
  }, [focus, hung])

  return (
    <group>
      {hung.map(({ p, position, rotY }) => (
        <PaintingFrame key={p.id} painting={p} position={position} rotY={rotY}
          isFocused={focus?.id === p.id}
          onFocus={() => setFocus(p)}
          floating={night.layout === 'float'} glow={night.glow} />
      ))}
      {community && <CommunityPainting painting={community} night={night} />}
      {night.shell && <MuralWall paintings={paintings} />}
      <FirstPersonRig focusTarget={focusTarget} onWalkAway={() => setFocus(null)} />
    </group>
  )
}
