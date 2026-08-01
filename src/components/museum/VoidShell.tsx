'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { mulberry32 } from '@/components/particle-draw'
import type { Night } from '@/lib/environments'
import type { Ambience } from '@/lib/mood'

/* The open-void nights: no walls, no ceiling — a dark reflective ground, weather made of
   dust and stars, and shafts of god-light. The fog closes the horizon so the void feels
   endless instead of empty. Static geometry; per-frame work is one dust drift. */
const FLOOR_SIZE = 60
const STAR_RADIUS = 34

function Stars({ color, count }: { color: string; count: number }) {
  const positions = useMemo(() => {
    const rnd = mulberry32(20260731)
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // upper hemisphere shell — stars never sit below the floor
      const theta = rnd() * Math.PI * 2
      const phi = Math.acos(rnd())               // 0..π/2
      const r = STAR_RADIUS * (0.8 + rnd() * 0.2)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 1
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    return arr
  }, [count])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.09} transparent opacity={0.8} sizeAttenuation depthWrite={false} />
    </points>
  )
}

function VoidDust({ color, count, opacity, speedMul }: { color: string; count: number; opacity: number; speedMul: number }) {
  const group = useRef<THREE.Group>(null)
  const positions = useMemo(() => {
    const rnd = mulberry32(20260731 + count)
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rnd() - 0.5) * 22
      arr[i * 3 + 1] = 0.2 + rnd() * 6
      arr[i * 3 + 2] = -6 + rnd() * 16
    }
    return arr
  }, [count])
  useFrame(({ clock }, dt) => {
    const g = group.current
    if (!g) return
    g.rotation.y += dt * 0.012 * speedMul
    g.position.y = Math.sin(clock.elapsedTime * 0.14 * speedMul) * 0.14
  })
  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.022} transparent opacity={opacity} sizeAttenuation depthWrite={false} />
      </points>
    </group>
  )
}

const RAY_SLOTS: { x: number; z: number; tilt: number }[] = [
  { x: -4.2, z: -1.5, tilt: 0.12 }, { x: 3.4, z: 1.8, tilt: -0.09 },
  { x: 0.4, z: -3.4, tilt: 0.05 }, { x: -1.8, z: 3.6, tilt: -0.14 },
]

function GodRays({ color, count, rayMul }: { color: string; count: number; rayMul: number }) {
  return (
    <group>
      {RAY_SLOTS.slice(0, count).map((s, i) => (
        <mesh key={i} position={[s.x, 7, s.z]} rotation={[s.tilt, 0, s.tilt * 1.4]}>
          <coneGeometry args={[3.2, 14, 24, 1, true]} />
          <meshBasicMaterial color={color} transparent opacity={0.045 * rayMul}
            blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

const NEUTRAL: Ambience = { dustMul: 1, speedMul: 1, rayMul: 1, ambientMul: 1, fogNearMul: 1, motto: null }

export default function VoidShell({ night, amb = NEUTRAL }: { night: Night; amb?: Ambience }) {
  const floor = night.floor ?? { color: '#0a0a0a', mirror: false }
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]}>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        {floor.mirror ? (
          /* the wet-stone mirror of the reference boards — soft, blurred, never literal */
          <MeshReflectorMaterial color={floor.color} resolution={256} mirror={0.45}
            blur={[300, 100]} mixBlur={1} mixStrength={0.6} roughness={0.8}
            depthScale={0.6} minDepthThreshold={0.4} maxDepthThreshold={1.4} />
        ) : (
          <meshStandardMaterial color={floor.color} roughness={0.9} />
        )}
      </mesh>
      {night.stars && <Stars color={night.stars.color} count={night.stars.count} />}
      {night.dust && <VoidDust color={night.dust.color} count={Math.round(night.dust.count * amb.dustMul)}
        opacity={night.dust.opacity} speedMul={amb.speedMul} />}
      {night.rays && <GodRays color={night.rays.color} count={night.rays.count} rayMul={amb.rayMul} />}
    </group>
  )
}
