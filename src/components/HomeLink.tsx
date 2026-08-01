'use client'

/* Every page keeps one quiet way back to the front door — a registrar's note that answers.
   Sits just under the arch-tl chrome caption; z7 clears the museum canvas and scenography. */
const LABEL = '← Return to the Entrance'
const POS: React.CSSProperties = { position: 'fixed', top: '2.55rem', left: '1.3rem', zIndex: 7 }

export default function HomeLink({ onHome }: { onHome?: () => void }) {
  if (onHome) {
    return (
      <button type="button" className="arch-note home-link" style={POS} onClick={onHome} aria-label="Return to the entrance">
        {LABEL}
      </button>
    )
  }
  return (
    <a className="arch-note home-link" style={POS} href="/" aria-label="Return to the entrance">
      {LABEL}
    </a>
  )
}
