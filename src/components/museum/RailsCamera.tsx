'use client'
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const X_MIN = -7, X_MAX = 7
const HOME_POS: [number, number, number] = [0, 1.6, 4]
const HOME_LOOK: [number, number, number] = [0, 1.6, -5]

export default function RailsCamera({ focusTarget }: { focusTarget: { x: number; y: number; z: number } | null }) {
  const { camera, gl } = useThree()
  const stand = useRef(new THREE.Vector3(...HOME_POS))
  const look = useRef(new THREE.Vector3(...HOME_LOOK))
  const gaze = useRef(new THREE.Vector3(...HOME_LOOK))

  useEffect(() => {
    if (focusTarget) {
      stand.current.set(focusTarget.x, Math.max(1.2, focusTarget.y), focusTarget.z + 1.4)
      look.current.set(focusTarget.x, focusTarget.y, focusTarget.z)
    }
  }, [focusTarget])

  useEffect(() => {
    const el = gl.domElement
    const glide = (dx: number) => {
      stand.current.x = THREE.MathUtils.clamp(stand.current.x + dx, X_MIN, X_MAX)
      stand.current.y = 1.6; stand.current.z = 3.2
      look.current.set(stand.current.x, 1.6, -5)
    }
    const onWheel = (e: WheelEvent) => glide(e.deltaY * 0.008)
    let touchX = 0
    const onTouchStart = (e: TouchEvent) => { touchX = e.touches[0].clientX }
    const onTouchMove = (e: TouchEvent) => { const dx = e.touches[0].clientX - touchX; touchX = e.touches[0].clientX; glide(-dx * 0.015) }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { stand.current.set(...HOME_POS); look.current.set(...HOME_LOOK) }
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [gl])

  useFrame(() => {
    camera.position.lerp(stand.current, 0.06)
    gaze.current.lerp(look.current, 0.08)
    camera.lookAt(gaze.current)
  })
  return null
}
