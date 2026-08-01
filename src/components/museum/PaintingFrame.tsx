'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Text } from '@react-three/drei'
import * as THREE from 'three'
import { drawParticlePainting, seedFrom } from '@/components/particle-draw'
import { getSessionId } from '@/lib/session'
import { accessionOf } from '@/lib/accession'
import type { PaintingRow } from './GalleryRoom'

/* Rows painted since the single-canvas change carry one url and hang as one larger square;
   the founding triptychs (three urls) keep their three small panels. */
const PANEL = 0.5, SOLO_PANEL = 0.85, GAP = 0.04
const MAX_LIGHT_ORBS = 12
const BLOOM_MS = 1200
const PARTICLE_TEX_PX = 256

function particleTexture(palette: string[], arousal: number, seed: number) {
  const c = document.createElement('canvas'); c.width = c.height = PARTICLE_TEX_PX
  drawParticlePainting(c.getContext('2d')!, palette, arousal, seed, PARTICLE_TEX_PX)
  return new THREE.CanvasTexture(c)
}

/* one soft radial halo texture per night's glow colour, shared by every floating frame */
const haloCache = new Map<string, THREE.CanvasTexture>()
function haloTexture(glow: string) {
  const hit = haloCache.get(glow)
  if (hit) return hit
  const c = document.createElement('canvas'); c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, glow + '0.5)')
  g.addColorStop(0.55, glow + '0.14)')
  g.addColorStop(1, glow + '0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  haloCache.set(glow, tex)
  return tex
}

function Panel({ url, palette, arousal, seed, x, size }: { url: string; palette: string[]; arousal: number; seed: number; x: number; size: number }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let disposed = false
    let made: THREE.Texture | null = null
    const keep = (t: THREE.Texture) => { made = t; setTex(t) }
    const fallback = () => { if (!disposed) keep(particleTexture(palette, arousal, seed)) }
    if (!url) fallback()
    // mock-provider runs uploaded 1×1 red PNGs to real storage; a stretched red pixel is
    // not a painting — anything that tiny falls back to particle art
    else new THREE.TextureLoader().load(url, t => {
      const img = t.image as { width?: number; height?: number } | undefined
      if (disposed || !img || (img.width ?? 0) <= 2 || (img.height ?? 0) <= 2) { t.dispose(); fallback() }
      else keep(t)
    }, undefined, fallback)
    // a wall of 120 paintings churns textures as you walk it; GPU memory has to be handed back
    return () => { disposed = true; made?.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])
  if (!tex) return null
  return (
    <mesh position={[x, 0, 0.02]}>
      <planeGeometry args={[size, size]} />
      {/* the canvas is softly backlit by its own image — paintings read on every wall of
          every night without chasing them with point lights */}
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.22} roughness={0.9} />
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

export default function PaintingFrame({ painting, position, isFocused, onFocus, floating = false, glow, rotY = 0 }: {
  painting: PaintingRow; position: { x: number; y: number; z: number }
  isFocused: boolean; onFocus: () => void; floating?: boolean; glow?: string; rotY?: number
}) {
  const group = useRef<THREE.Group>(null)
  const born = useRef(performance.now())
  const bloomed = useRef(false)
  const reduced = useRef(false)
  useEffect(() => { reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches }, [])
  // each frame drifts on its own phase so the void breathes out of sync, like slow water
  const bobPhase = useMemo(() => (seedFrom(painting.id, 2) % 628) / 100, [painting.id])
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    if (!bloomed.current) {                          // bloom-in on mount
      if (reduced.current) { g.scale.setScalar(1); bloomed.current = true; return }
      const t = Math.min(1, (performance.now() - born.current) / BLOOM_MS)
      const s = 0.2 + 0.8 * (1 - Math.pow(1 - t, 3))
      g.scale.setScalar(s)
      if (t >= 1) bloomed.current = true
      return
    }
    if (!floating || reduced.current) return         // wall nights settle and stop paying per-frame
    // focused frames hold still so the plaque reads; others keep drifting
    const bob = isFocused ? 0 : Math.sin(clock.elapsedTime * 0.5 + bobPhase) * 0.1
    g.position.y = position.y + bob
    g.rotation.z = isFocused ? 0 : Math.sin(clock.elapsedTime * 0.3 + bobPhase) * 0.012
  })

  const urls = painting.panel_urls?.length ? painting.panel_urls.slice(0, 3) : ['']
  const solo = urls.length === 1
  const panelSize = solo ? SOLO_PANEL : PANEL
  const width = solo ? SOLO_PANEL : PANEL * 3 + GAP * 2
  const mergedPalette = useMemo(() => (painting.palette ?? []).flat(), [painting.palette])
  const medium = painting.is_seed ? 'FOUNDING COLLECTION' : solo ? 'DISSOLVED WORDS ON CANVAS' : 'DISSOLVED WORDS ON THREE PANELS'
  const catalogLine = `${medium} · ${accessionOf(painting)} · ${painting.lights} ${painting.lights === 1 ? 'LIGHT' : 'LIGHTS'}`
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
    <group ref={group} position={[position.x, position.y, position.z]} rotation={[0, rotY, 0]}
      onClick={e => { e.stopPropagation(); onFocus() }}>
      {floating && glow && (
        /* the warm breath of light each frame carries through the void */
        <mesh position={[0, 0, -0.09]}>
          <planeGeometry args={[width + 1.4, panelSize + 1.4]} />
          <meshBasicMaterial map={haloTexture(glow)} transparent
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[width + 0.12, panelSize + 0.12, 0.06]} />
        <meshStandardMaterial color="#2a241c" roughness={0.7} />
      </mesh>
      {urls.map((u, i) => (
        <Panel key={i} url={u ?? ''}
          palette={solo
            ? (mergedPalette.length ? mergedPalette : ['#4a5d73', '#7d8fa3', '#2c3644'])
            : (painting.palette[i] ?? ['#4a5d73', '#7d8fa3', '#2c3644'])}
          arousal={painting.arousal} seed={seedFrom(painting.id, i)}
          x={(i - (urls.length - 1) / 2) * (panelSize + GAP)} size={panelSize} />
      ))}
      {/* a proper two-line wall label: italic title, then the registrar's catalog line */}
      <Text font="/fonts/EBGaramond-Italic.ttf" position={[0, -panelSize / 2 - 0.10, 0.02]}
        fontSize={0.05} color="#e8e2d6" anchorX="center" anchorY="top" maxWidth={Math.max(width, 1.2)}>
        {painting.arc_words.join(', ')}
      </Text>
      <Text font="/fonts/EBGaramond-Regular.ttf" position={[0, -panelSize / 2 - 0.175, 0.02]}
        fontSize={0.026} letterSpacing={0.18} color="#8d8578" anchorX="center" anchorY="top" maxWidth={Math.max(width, 1.2) * 1.5}>
        {catalogLine}
      </Text>
      {Array.from({ length: orbs }, (_, i) => (
        <mesh key={i} position={[-width / 2 + 0.08 + i * 0.11, -panelSize / 2 - 0.05, 0.05]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial emissive="#ffd9a0" emissiveIntensity={2} color="#ffd9a0" />
        </mesh>
      ))}
      {isFocused && <FrameSpot y={0} />}
      {isFocused && (
        <Html center distanceFactor={2} position={[0, -panelSize / 2 - 0.34, 0.05]}>
          <button onClick={leaveLight} disabled={litHere}
            style={{ background: 'none', border: '1px solid #c9a86a', color: '#c9a86a', padding: '.3rem .8rem', font: 'italic 13px Georgia, serif', whiteSpace: 'nowrap', opacity: litHere ? 0.7 : 1 }}>
            {litHere ? 'a light is yours here' : 'leave a light'}
          </button>
        </Html>
      )}
    </group>
  )
}
