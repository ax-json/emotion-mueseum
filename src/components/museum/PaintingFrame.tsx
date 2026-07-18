'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Text } from '@react-three/drei'
import * as THREE from 'three'
import { drawParticlePainting, seedFrom } from '@/components/particle-draw'
import { getSessionId } from '@/lib/session'
import type { PaintingRow } from './GalleryRoom'

const PANEL = 0.5, GAP = 0.04
const MAX_LIGHT_ORBS = 12

function particleTexture(palette: string[], arousal: number, seed: number) {
  const c = document.createElement('canvas'); c.width = c.height = 256
  drawParticlePainting(c.getContext('2d')!, palette, arousal, seed, 256)
  return new THREE.CanvasTexture(c)
}

function Panel({ url, palette, arousal, seed, x }: { url: string; palette: string[]; arousal: number; seed: number; x: number }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let disposed = false
    const fallback = () => { if (!disposed) setTex(particleTexture(palette, arousal, seed)) }
    if (!url) fallback()
    else new THREE.TextureLoader().load(url, t => { if (!disposed) setTex(t) }, undefined, fallback)
    return () => { disposed = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])
  if (!tex) return null
  return (
    <mesh position={[x, 0, 0.02]}>
      <planeGeometry args={[PANEL, PANEL]} />
      <meshStandardMaterial map={tex} roughness={0.9} />
    </mesh>
  )
}

function FrameSpot({ y }: { y: number }) {
  const target = useMemo(() => new THREE.Object3D(), [])
  return (
    <>
      <primitive object={target} position={[0, 0, 0]} />
      <spotLight position={[0, y + 1.4, 1.6]} target={target} intensity={2} angle={0.35} penumbra={0.6} distance={8} color="#ffe8c0" />
    </>
  )
}

export default function PaintingFrame({ painting, position, isFocused, onFocus }: {
  painting: PaintingRow; position: { x: number; y: number; z: number }
  isFocused: boolean; onFocus: () => void
}) {
  const group = useRef<THREE.Group>(null)
  const born = useRef(performance.now())
  useFrame(() => {                                   // bloom-in on mount
    const g = group.current; if (!g) return
    const t = Math.min(1, (performance.now() - born.current) / 1200)
    const s = 0.2 + 0.8 * (1 - Math.pow(1 - t, 3))
    g.scale.setScalar(s)
  })
  const when = new Date(painting.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const plaque = `${painting.is_seed ? 'founding collection · ' : ''}${painting.arc_words.join(' · ')} · ${when}`
  const width = PANEL * 3 + GAP * 2
  const [litHere, setLitHere] = useState(false)
  const orbs = Math.min(painting.lights + (litHere ? 1 : 0), MAX_LIGHT_ORBS)

  async function leaveLight() {
    if (litHere) return
    setLitHere(true)                                  // optimistic — never show failure (spec §7)
    const res = await fetch('/api/light', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': getSessionId() },
      body: JSON.stringify({ paintingId: painting.id }),
    }).then(r => r.json()).catch(() => null)
    if (res && res.ok === false) setLitHere(true)     // cap reached / repeat → still reads "yours here"
  }
  return (
    <group ref={group} position={[position.x, position.y, position.z]}
      onClick={e => { e.stopPropagation(); onFocus() }}>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[width + 0.12, PANEL + 0.12, 0.06]} />
        <meshStandardMaterial color="#2a241c" roughness={0.7} />
      </mesh>
      {[0, 1, 2].map(i => (
        <Panel key={i} url={painting.panel_urls[i] ?? ''}
          palette={painting.palette[i] ?? ['#4a5d73', '#7d8fa3', '#2c3644']}
          arousal={painting.arousal} seed={seedFrom(painting.id, i)}
          x={(i - 1) * (PANEL + GAP)} />
      ))}
      <Text position={[0, -PANEL / 2 - 0.12, 0.02]} fontSize={0.045} color="#8d8578" anchorX="center" anchorY="top" maxWidth={width}>
        {plaque}
      </Text>
      {Array.from({ length: orbs }, (_, i) => (
        <mesh key={i} position={[-width / 2 + 0.08 + i * 0.11, -PANEL / 2 - 0.05, 0.05]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial emissive="#ffd9a0" emissiveIntensity={2} color="#ffd9a0" />
        </mesh>
      ))}
      {isFocused && <FrameSpot y={0} />}
      {isFocused && (
        <Html center distanceFactor={2} position={[0, -PANEL / 2 - 0.34, 0.05]}>
          <button onClick={leaveLight} disabled={litHere}
            style={{ background: 'none', border: '1px solid #c9a86a', color: '#c9a86a', padding: '.3rem .8rem', font: 'italic 13px Georgia, serif', whiteSpace: 'nowrap', opacity: litHere ? 0.7 : 1 }}>
            {litHere ? 'a light is yours here' : 'leave a light'}
          </button>
        </Html>
      )}
    </group>
  )
}
