/* The museum's rotating nights: each visit rolls one environment, so the same collection
   is met in a different weather of light every time. One classic room plus four ethereal
   voids drawn from the reference boards — floating gold panels, glass garden shafts,
   a letter-tree of ember dust, doors adrift in blue cloud. */

export interface NightScatter {
  xSpread: number; yMin: number; yMax: number; zMin: number; zMax: number
}

export interface Night {
  id: string
  name: string
  motto: string
  bg: string
  fog: { color: string; near: number; far: number }
  ambient: { color: string; intensity: number }
  hemi: { sky: string; ground: string; intensity: number }
  key: { color: string; intensity: number; position: [number, number, number] }
  shell: boolean                                  // classic room geometry vs open void
  layout: 'wall' | 'float'
  floor?: { color: string; mirror: boolean }
  stars?: { color: string; count: number }
  dust?: { color: string; count: number; opacity: number }
  glow?: string                                   // rgba( prefix for the halo behind floating frames
  rays?: { color: string; count: number }
  scatter?: NightScatter
}

export const NIGHTS: Night[] = [
  {
    id: 'long-hall', name: 'The Long Hall', motto: 'the walls hold what the day could not',
    bg: '#0b1512', fog: { color: '#0b1512', near: 14, far: 34 },
    ambient: { color: '#ffffff', intensity: 0.75 },
    hemi: { sky: '#f0e2c8', ground: '#241c12', intensity: 0.7 },
    key: { color: '#f0e2c8', intensity: 0.9, position: [0, 6, 4] },
    shell: true, layout: 'wall',
  },
  {
    id: 'golden-hour', name: 'The Golden Hour', motto: 'every feeling hung in amber',
    bg: '#1a1008', fog: { color: '#241505', near: 9, far: 30 },
    ambient: { color: '#ffd9a0', intensity: 0.5 },
    hemi: { sky: '#ffb84d', ground: '#120a04', intensity: 0.6 },
    key: { color: '#ffcf80', intensity: 1.2, position: [0, 10, 2] },
    shell: false, layout: 'float',
    floor: { color: '#171008', mirror: true },
    dust: { color: '#ffd9a0', count: 400, opacity: 0.5 },
    glow: 'rgba(255,200,120,',
    rays: { color: '#ffcf80', count: 3 },
    scatter: { xSpread: 6.4, yMin: 1.0, yMax: 3.6, zMin: -4.4, zMax: 5.2 },
  },
  {
    id: 'glass-garden', name: 'The Glass Garden', motto: 'light falls through leaves that are not there',
    bg: '#06120e', fog: { color: '#08201a', near: 8, far: 26 },
    ambient: { color: '#bfe8d8', intensity: 0.35 },
    hemi: { sky: '#9fd8c0', ground: '#03100c', intensity: 0.55 },
    key: { color: '#eafff4', intensity: 1.1, position: [3, 11, 1] },
    shell: false, layout: 'float',
    floor: { color: '#05100c', mirror: true },
    dust: { color: '#cfeee0', count: 340, opacity: 0.4 },
    glow: 'rgba(190,255,225,',
    rays: { color: '#eafff4', count: 4 },
    scatter: { xSpread: 6.2, yMin: 1.1, yMax: 3.4, zMin: -4.4, zMax: 5.0 },
  },
  {
    id: 'letter-tree', name: 'The Letter Tree', motto: 'a thousand evenings grown into one trunk',
    bg: '#050a18', fog: { color: '#071026', near: 9, far: 30 },
    ambient: { color: '#ffd9a0', intensity: 0.4 },
    hemi: { sky: '#4a6aa8', ground: '#050810', intensity: 0.5 },
    key: { color: '#ffc46a', intensity: 1.3, position: [0, 9, 0] },
    shell: false, layout: 'float',
    floor: { color: '#060a14', mirror: false },
    stars: { color: '#9db8ff', count: 700 },
    dust: { color: '#ffc46a', count: 520, opacity: 0.55 },
    glow: 'rgba(255,196,106,',
    scatter: { xSpread: 4.6, yMin: 1.2, yMax: 3.8, zMin: -4.2, zMax: 4.2 },
  },
  {
    id: 'hundred-doors', name: 'The Hundred Doors', motto: 'each frame a door someone left open',
    bg: '#0a1226', fog: { color: '#101a33', near: 8, far: 24 },
    ambient: { color: '#cdd8ff', intensity: 0.45 },
    hemi: { sky: '#7d90c8', ground: '#080a14', intensity: 0.55 },
    key: { color: '#ffd9a0', intensity: 0.9, position: [0, 8, 4] },
    shell: false, layout: 'float',
    floor: { color: '#0a0f1e', mirror: true },
    stars: { color: '#cdd8ff', count: 400 },
    dust: { color: '#cdd8ff', count: 300, opacity: 0.35 },
    glow: 'rgba(255,214,150,',
    rays: { color: '#aebcf0', count: 2 },
    scatter: { xSpread: 6.8, yMin: 0.9, yMax: 3.9, zMin: -4.4, zMax: 5.4 },
  },
]

export function pickNight(): Night {
  // ?night=<id> pins the roll — demo and debugging control
  if (typeof window !== 'undefined') {
    const asked = new URLSearchParams(window.location.search).get('night')
    const pinned = NIGHTS.find(n => n.id === asked)
    if (pinned) return pinned
  }
  return NIGHTS[Math.floor(Math.random() * NIGHTS.length)]
}
