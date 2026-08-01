'use client'
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* First-person walk. WASD/arrows move, dragging the canvas looks around, the wheel dollies,
   clicking a painting hands control to the focus dolly — any movement key takes it back.
   All per-frame math mutates preallocated vectors; nothing allocates in the loop. */
const SPEED = 3
const EYE = 1.6
const LOOK = 0.0028
const PITCH_MAX = 0.5
const BOB_HZ = 7.2, BOB_AMP = 0.028
const MAX_DT = 0.05                       // tab-return frames must not teleport the visitor
const BOUNDS = { xMin: -6.9, xMax: 7.5, zMin: -3.9, zMax: 8.4 }
const KEYMAP: Record<string, 'f' | 'b' | 'l' | 'r'> = {
  KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b',
  KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r',
}

/* nx/nz: the painting's facing normal — the dolly stands 1.6m along it, whatever wall
   or sky the frame hangs in. Older callers without a normal get the old face-+z stance. */
type Focus = { x: number; y: number; z: number; nx?: number; nz?: number } | null

export default function FirstPersonRig({ focusTarget, onWalkAway }: {
  focusTarget: Focus; onWalkAway: () => void
}) {
  const { camera, gl } = useThree()
  const keys = useRef(new Set<string>())
  const yaw = useRef(0)
  const pitch = useRef(0)
  const pos = useRef(new THREE.Vector3(0, EYE, 6.5))
  const vel = useRef(new THREE.Vector3())
  const want = useRef(new THREE.Vector3())
  const stand = useRef(new THREE.Vector3())
  const gaze = useRef(new THREE.Vector3(0, EYE, 0))
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const bobT = useRef(0)
  const focusRef = useRef<Focus>(null)
  const wasFocused = useRef(false)
  const reduced = useRef(false)

  useEffect(() => { reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches }, [])
  useEffect(() => { focusRef.current = focusTarget }, [focusTarget])

  useEffect(() => {
    const el = gl.domElement
    let dragging = false, lastX = 0, lastY = 0
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEYMAP[e.code]
      if (dir) {
        keys.current.add(dir)
        if (focusRef.current) onWalkAway()             // stepping back from a painting
      }
      if (e.code === 'Escape') onWalkAway()
    }
    const onKeyUp = (e: KeyboardEvent) => { const d = KEYMAP[e.code]; if (d) keys.current.delete(d) }
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      yaw.current -= (e.clientX - lastX) * LOOK
      pitch.current = THREE.MathUtils.clamp(pitch.current - (e.clientY - lastY) * LOOK, -PITCH_MAX, PITCH_MAX)
      lastX = e.clientX; lastY = e.clientY
    }
    const onUp = () => { dragging = false }
    const onWheel = (e: WheelEvent) => {
      const step = e.deltaY * 0.004
      pos.current.x += Math.sin(yaw.current) * step
      pos.current.z += Math.cos(yaw.current) * step
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [gl, onWalkAway])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, MAX_DT)
    const f = focusRef.current
    if (f) {
      if (!wasFocused.current) gaze.current.set(f.x, f.y, f.z + 0.0001)  // arrive, then settle
      wasFocused.current = true
      stand.current.set(f.x + (f.nx ?? 0) * 1.6, Math.max(1.25, f.y), f.z + (f.nz ?? 1) * 1.6)
      camera.position.lerp(stand.current, 0.06)
      want.current.set(f.x, f.y, f.z)
      gaze.current.lerp(want.current, 0.08)
      camera.lookAt(gaze.current)
      return
    }
    if (wasFocused.current) {
      // hand control back exactly where the dolly left the visitor — no snap
      wasFocused.current = false
      pos.current.set(camera.position.x, EYE, camera.position.z)
      euler.current.setFromQuaternion(camera.quaternion)
      yaw.current = euler.current.y
      pitch.current = THREE.MathUtils.clamp(euler.current.x, -PITCH_MAX, PITCH_MAX)
    }
    const k = keys.current
    const fwd = (k.has('f') ? 1 : 0) - (k.has('b') ? 1 : 0)
    const strafe = (k.has('r') ? 1 : 0) - (k.has('l') ? 1 : 0)
    const sin = Math.sin(yaw.current), cos = Math.cos(yaw.current)
    want.current.set(-sin * fwd + cos * strafe, 0, -cos * fwd - sin * strafe)
    if (want.current.lengthSq() > 0) want.current.normalize().multiplyScalar(SPEED)
    vel.current.lerp(want.current, 1 - Math.pow(0.0001, dt))            // frame-rate independent glide
    pos.current.x = THREE.MathUtils.clamp(pos.current.x + vel.current.x * dt, BOUNDS.xMin, BOUNDS.xMax)
    pos.current.z = THREE.MathUtils.clamp(pos.current.z + vel.current.z * dt, BOUNDS.zMin, BOUNDS.zMax)
    const speed = vel.current.length()
    if (speed > 0.3 && !reduced.current) bobT.current += dt
    const bob = reduced.current ? 0 : Math.sin(bobT.current * BOB_HZ * Math.PI) * BOB_AMP * Math.min(1, speed / SPEED)
    camera.position.set(pos.current.x, EYE + bob, pos.current.z)
    euler.current.set(pitch.current, yaw.current, 0)
    camera.quaternion.setFromEuler(euler.current)
  })
  return null
}
