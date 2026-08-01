'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '@/components/particle-draw'

/* The building itself: floor, four walls, ceiling, a doorway glowing at the visitor's back,
   columns, benches, a carpet runner, three breathing pendant lamps and drifting dust.
   Static geometry throughout — the only per-frame work is one lamp flicker and one dust drift. */
const W = 16.8, D = 14.8, H = 4.2
const X = W / 2                       // ±8.4
const Z_BACK = -5.15, Z_FRONT = 9.4   // paintings hang at z = -4.9, just proud of the back wall
const Z_MID = (Z_BACK + Z_FRONT) / 2

const WALL = { color: '#221c15', roughness: 0.95 }
const TRIM = { color: '#0b0a08', roughness: 0.9 }

function Lamps() {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    const m = mat.current
    if (!m) return
    const t = clock.elapsedTime
    m.emissiveIntensity = 1.7 + Math.sin(t * 1.7) * 0.12 + Math.sin(t * 4.3) * 0.05
  })
  return (
    <group>
      {[-2, 2, 6].map(z => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, H - 0.45, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.9, 6]} />
            <meshStandardMaterial color="#0a0908" />
          </mesh>
          <mesh position={[0, H - 0.95, 0]}>
            <sphereGeometry args={[0.11, 16, 12]} />
            {/* one flickering material ref is enough to read as "alive"; the others hold steady */}
            <meshStandardMaterial ref={z === -2 ? mat : undefined} color="#3a2f1e" emissive="#ffd9a0" emissiveIntensity={1.7} />
          </mesh>
          <pointLight position={[0, H - 1.05, 0]} intensity={8} distance={11} decay={1.6} color="#ffd9a0" />
        </group>
      ))}
    </group>
  )
}

function Dust() {
  const group = useRef<THREE.Group>(null)
  const positions = useMemo(() => {
    const rnd = mulberry32(20260730)
    const arr = new Float32Array(260 * 3)
    for (let i = 0; i < 260; i++) {
      arr[i * 3] = (rnd() - 0.5) * (W - 1)
      arr[i * 3 + 1] = 0.3 + rnd() * (H - 0.8)
      arr[i * 3 + 2] = Z_BACK + 0.5 + rnd() * (D - 1)
    }
    return arr
  }, [])
  useFrame(({ clock }, dt) => {
    const g = group.current
    if (!g) return
    g.rotation.y += dt * 0.009                                  // motes wander, never rush
    g.position.y = Math.sin(clock.elapsedTime * 0.16) * 0.09
  })
  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#d8c9a8" size={0.018} transparent opacity={0.32} sizeAttenuation />
      </points>
    </group>
  )
}

export default function RoomShell() {
  return (
    <group>
      {/* floor + carpet runner */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, Z_MID]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#14120f" roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, Z_MID]}>
        <planeGeometry args={[2.4, D - 1.6]} />
        <meshStandardMaterial color="#2c1a15" roughness={1} />
      </mesh>
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, Z_MID]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#161310" roughness={0.95} />
      </mesh>
      {/* back wall — the paintings' wall */}
      <mesh position={[0, H / 2, Z_BACK]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial {...WALL} />
      </mesh>
      {/* side walls */}
      <mesh position={[-X, H / 2, Z_MID]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial {...WALL} />
      </mesh>
      <mesh position={[X, H / 2, Z_MID]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial {...WALL} />
      </mesh>
      {/* front wall with a doorway the visitor arrived through */}
      <mesh position={[-(X / 2 + 0.65), H / 2, Z_FRONT]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[X - 1.3, H]} />
        <meshStandardMaterial {...WALL} />
      </mesh>
      <mesh position={[X / 2 + 0.65, H / 2, Z_FRONT]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[X - 1.3, H]} />
        <meshStandardMaterial {...WALL} />
      </mesh>
      <mesh position={[0, H - 0.5, Z_FRONT]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.6, 1]} />
        <meshStandardMaterial {...WALL} />
      </mesh>
      <mesh position={[0, 1.55, Z_FRONT + 0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.4, 3.1]} />
        <meshStandardMaterial color="#2a2014" emissive="#c9a86a" emissiveIntensity={0.32} />
      </mesh>
      {/* skirting + cornice on the paintings' wall */}
      {[0.07, H - 0.07].map(y => (
        <mesh key={y} position={[0, y, Z_BACK + 0.02]}>
          <boxGeometry args={[W, 0.14, 0.05]} />
          <meshStandardMaterial {...TRIM} />
        </mesh>
      ))}
      {/* columns pace the side walls */}
      {[-4, 0, 4, 8].map(z => (
        <group key={z}>
          <mesh position={[-(X - 0.28), H / 2, z]}>
            <boxGeometry args={[0.42, H, 0.42]} />
            <meshStandardMaterial color="#1e1a14" roughness={0.8} />
          </mesh>
          <mesh position={[X - 0.28, H / 2, z]}>
            <boxGeometry args={[0.42, H, 0.42]} />
            <meshStandardMaterial color="#1e1a14" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* benches to sit with the paintings */}
      {[0, 4.5].map(z => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[1.9, 0.1, 0.52]} />
            <meshStandardMaterial color="#241c12" roughness={0.6} />
          </mesh>
          <mesh position={[-0.8, 0.1, 0]}>
            <boxGeometry args={[0.1, 0.2, 0.44]} />
            <meshStandardMaterial {...TRIM} />
          </mesh>
          <mesh position={[0.8, 0.1, 0]}>
            <boxGeometry args={[0.1, 0.2, 0.44]} />
            <meshStandardMaterial {...TRIM} />
          </mesh>
        </group>
      ))}
      {/* side walls carry paintings now — two dim washes so they read, pendants still lead */}
      <pointLight position={[-5.6, 2.9, 1]} intensity={10} distance={13} decay={1.6} color="#e8cf9e" />
      <pointLight position={[5.6, 2.9, 1]} intensity={10} distance={13} decay={1.6} color="#e8cf9e" />
      <pointLight position={[0, 2.9, 8]} intensity={7} distance={11} decay={1.6} color="#e8cf9e" />
      <Lamps />
      <Dust />
    </group>
  )
}
