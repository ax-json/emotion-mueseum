'use client'
import { useEffect, useMemo, useState } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { drawParticlePainting, seedFrom } from '@/components/particle-draw'
import type { Night } from '@/lib/environments'
import type { PaintingRow } from './GalleryRoom'

/* The communal canvas: one painting holding the mean emotion of everyone who has ever
   let an evening go here. It hangs apart from the collection and WAY larger — 3m in the
   hall's back-wall centre, 4m adrift behind the void — under its own pair of spotlights
   and, in the open nights, a god-ray falling from above. */

const HALL_SIZE = 3.0
const FLOAT_SIZE = 4.0
const PARTICLE_TEX_PX = 512

function CommunityCanvas({ url, palette, arousal, seed, size }: {
  url: string; palette: string[]; arousal: number; seed: number; size: number
}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let disposed = false
    let made: THREE.Texture | null = null
    const keep = (t: THREE.Texture) => { made = t; setTex(t) }
    const fallback = () => {                            // '' or tiny mock pixels → monumental particle art
      if (disposed) return
      const c = document.createElement('canvas'); c.width = c.height = PARTICLE_TEX_PX
      // four passes: at 3-4m fewer strokes read as empty charcoal under the spotlights
      const cctx = c.getContext('2d')!
      drawParticlePainting(cctx, palette, arousal, seed, PARTICLE_TEX_PX)
      for (const off of [7, 13, 29]) {
        cctx.globalCompositeOperation = 'lighter'
        drawParticlePainting(cctx, palette, arousal, seed + off, PARTICLE_TEX_PX)
      }
      cctx.globalCompositeOperation = 'source-over'
      keep(new THREE.CanvasTexture(c))
    }
    if (!url) fallback()
    else new THREE.TextureLoader().load(url, t => {
      const img = t.image as { width?: number; height?: number } | undefined
      if (disposed || !img || (img.width ?? 0) <= 2 || (img.height ?? 0) <= 2) { t.dispose(); fallback() }
      else keep(t)
    }, undefined, fallback)
    return () => { disposed = true; made?.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])
  if (!tex) return null
  return (
    <mesh position={[0, 0, 0.03]}>
      <planeGeometry args={[size, size]} />
      {/* unlit on purpose: under the hall's twin spotlights and amber shafts a lit material
          washed the whole canvas out to a blank amber panel — the mural is a self-lit poster */}
      <meshBasicMaterial map={tex} toneMapped={false} fog={false} />
    </mesh>
  )
}

export default function CommunityPainting({ painting, night }: { painting: PaintingRow; night: Night }) {
  const size = night.shell ? HALL_SIZE : FLOAT_SIZE
  const position: [number, number, number] = night.shell ? [0, 2.05, -4.95] : [0, 3.1, -8.8]
  const spotTarget = useMemo(() => new THREE.Object3D(), [])
  const mergedPalette = useMemo(() => {
    const flat = (painting.palette ?? []).flat()
    return flat.length ? flat : ['#c9a86a', '#4a5d73', '#7d8f74']
  }, [painting.palette])
  const glow = night.glow ?? 'rgba(255,214,150,'
  const halo = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, glow + '0.30)')                 // soft crown — strong cores whited out the canvas
    g.addColorStop(0.5, glow + '0.10)')
    g.addColorStop(1, glow + '0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [glow])
  // r3f auto-dispose does not cover textures handed to materials as props
  useEffect(() => () => halo.dispose(), [halo])
  const catalogLine = `THE COMMUNAL CANVAS · painted from every evening hung here · ${painting.arc_words.join(' · ')}`
  return (
    <group position={position}>
      {/* its own weather of light */}
      <mesh position={[0, 0, -0.12]}>
        <planeGeometry args={[size * 2.1, size * 2.1]} />
        <meshBasicMaterial map={halo} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* twin spotlights raked from above, crossed like a stage */}
      <primitive object={spotTarget} position={[0, 0, 0]} />
      <spotLight position={[-size * 0.8, size * 0.9, 2.6]} target={spotTarget} intensity={3.5}
        angle={0.42} penumbra={0.65} distance={16} decay={1.6} color="#ffe8c0" />
      <spotLight position={[size * 0.8, size * 0.9, 2.6]} target={spotTarget} intensity={3.5}
        angle={0.42} penumbra={0.65} distance={16} decay={1.6} color="#ffd9a0" />
      {!night.shell && (
        /* in the open nights a god-ray falls on it from the dark above */
        <mesh position={[0, size * 0.95, 0.4]} rotation={[0.12, 0, 0]}>
          <coneGeometry args={[size * 0.85, size * 2.4, 24, 1, true]} />
          <meshBasicMaterial color="#ffe8c0" transparent opacity={0.05}
            blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* a heavier, gilded frame than any private evening gets */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[size + 0.3, size + 0.3, 0.1]} />
        <meshStandardMaterial color="#4a3a20" roughness={0.5} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[size + 0.16, size + 0.16, 0.09]} />
        <meshStandardMaterial color="#2a241c" roughness={0.7} />
      </mesh>
      <CommunityCanvas url={painting.panel_urls?.[0] ?? ''} palette={mergedPalette}
        arousal={painting.arousal} seed={seedFrom(painting.id, 0)} size={size} />
      <Text font="/fonts/EBGaramond-Italic.ttf" position={[0, -size / 2 - 0.22, 0.02]}
        fontSize={0.11} color="#e8e2d6" anchorX="center" anchorY="top" maxWidth={size}>
        the world tonight
      </Text>
      <Text font="/fonts/EBGaramond-Regular.ttf" position={[0, -size / 2 - 0.40, 0.02]}
        fontSize={0.045} letterSpacing={0.18} color="#8d8578" anchorX="center" anchorY="top" maxWidth={size * 1.4}>
        {catalogLine}
      </Text>
    </group>
  )
}
