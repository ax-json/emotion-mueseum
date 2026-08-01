'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32, seedFrom } from '@/components/particle-draw'
import type { PaintingRow } from './GalleryRoom'

const POINTS_PER_PAINTING = 80
const WALL_W = 8, WALL_H = 3
const GROW_MS = 2000

function PaintingCloud({ p, index }: { p: PaintingRow; index: number }) {
  const group = useRef<THREE.Group>(null)
  const born = useRef(performance.now())
  const positions = useMemo(() => {
    const rnd = mulberry32(seedFrom(p.id, 7))
    const cx = (p.valence * WALL_W) / 2               // valence → horizontal band centre
    const arr = new Float32Array(POINTS_PER_PAINTING * 3)
    for (let i = 0; i < POINTS_PER_PAINTING; i++) {
      arr[i * 3] = cx + (rnd() - 0.5) * 2.2
      arr[i * 3 + 1] = (rnd() - 0.5) * WALL_H * 0.8
      arr[i * 3 + 2] = (rnd() - 0.5) * 0.15
    }
    return arr
  }, [p.id, p.valence])
  const grown = useRef(false)
  useFrame(({ clock }) => {
    const g = group.current; if (!g) return
    if (!grown.current) {                                            // scale only until it has grown
      const grow = Math.min(1, (performance.now() - born.current) / GROW_MS)
      g.scale.setScalar(grow)
      if (grow >= 1) grown.current = true
    }
    g.position.y = Math.sin(clock.elapsedTime * 0.6 + index) * 0.06   // slow communal breathing
  })
  const color = p.palette?.[1]?.[0] ?? '#7d8fa3'
  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.02 + p.arousal * 0.04} transparent opacity={0.75} sizeAttenuation />
      </points>
    </group>
  )
}

export default function MuralWall({ paintings }: { paintings: PaintingRow[] }) {
  return (
    <group position={[-7.5, 1.7, -1]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[WALL_W + 1, WALL_H + 1]} />
        <meshStandardMaterial color="#191612" roughness={0.95} />
      </mesh>
      {paintings.slice(0, 40).map((p, i) => <PaintingCloud key={p.id} p={p} index={i} />)}
    </group>
  )
}
