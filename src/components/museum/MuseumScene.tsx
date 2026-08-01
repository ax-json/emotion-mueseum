'use client'
import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import GalleryRoom from './GalleryRoom'
import RoomShell from './RoomShell'
import VoidShell from './VoidShell'
import { pickNight, type Night } from '@/lib/environments'
import { loadMood, ambienceFor } from '@/lib/mood'

/* Every entry rolls a night: the same collection met in different weather each visit.
   The classic hall keeps its walls; the ethereal nights open into fog-closed voids.
   The visitor's own AI-read mood then bends the weather — light, fog, dust, rays. */
export default function MuseumScene({ highlightId, onNight }: { highlightId?: string; onNight?: (n: Night) => void }) {
  const [night] = useState<Night>(pickNight)
  const [mood] = useState(loadMood)
  const amb = ambienceFor(mood)
  useEffect(() => { onNight?.(night) }, [night, onNight])
  return (
    <Canvas dpr={[1, 1.25]} camera={{ position: [0, 1.6, 6.5], fov: 55 }} style={{ position: 'fixed', inset: 0 }}>
      <fog attach="fog" args={[night.fog.color, night.fog.near * amb.fogNearMul, night.fog.far]} />
      <color attach="background" args={[night.bg]} />
      <ambientLight color={night.ambient.color} intensity={night.ambient.intensity * amb.ambientMul} />
      <hemisphereLight args={[night.hemi.sky, night.hemi.ground, night.hemi.intensity]} />
      <directionalLight position={night.key.position} intensity={night.key.intensity} color={night.key.color} />
      {/* the visitor's emotion colour pools where they stand — their reading, made light */}
      {mood && <pointLight position={[0, 3.2, 5]} intensity={1.2} distance={12} decay={1.8} color={mood.tint} />}
      {night.shell ? <RoomShell /> : <VoidShell night={night} amb={amb} />}
      <Suspense fallback={null}>
        <GalleryRoom highlightId={highlightId} night={night} />
      </Suspense>
    </Canvas>
  )
}
