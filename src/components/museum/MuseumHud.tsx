'use client'
import { useEffect, useState } from 'react'

/* One quiet strip of controls. Keyboard hints only where a keyboard exists. */
export default function MuseumHud({ raised = false }: { raised?: boolean }) {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => { setCoarse(window.matchMedia('(pointer: coarse)').matches) }, [])
  return (
    <div className={raised ? 'museum-hud museum-hud--raised' : 'museum-hud'} aria-hidden>
      {coarse ? (
        <span>Drag to look around · tap a painting to draw near</span>
      ) : (
        <>
          <span><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> walk</span>
          <span>drag to look</span>
          <span>click a painting to draw near</span>
        </>
      )}
    </div>
  )
}
