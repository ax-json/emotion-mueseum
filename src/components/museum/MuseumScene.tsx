'use client'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import GalleryRoom from './GalleryRoom'

export default function MuseumScene({ highlightId }: { highlightId?: string }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1.6, 4], fov: 50 }} style={{ position: 'fixed', inset: 0 }}>
      <fog attach="fog" args={['#0e0d0b', 6, 18]} />
      <color attach="background" args={['#0e0d0b']} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[0, 6, 4]} intensity={0.25} color="#f0e2c8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#14120f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.5, -5]}>
        <planeGeometry args={[40, 8]} />
        <meshStandardMaterial color="#191612" roughness={0.95} />
      </mesh>
      <Suspense fallback={null}>
        <GalleryRoom highlightId={highlightId} />
      </Suspense>
    </Canvas>
  )
}
