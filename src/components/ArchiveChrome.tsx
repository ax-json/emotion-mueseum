'use client'
import { useEffect, useState } from 'react'

/* The document frame: every screen is a page in the museum's nocturnal register.
   Four fixed corner annotations in the registrar's voice; content swaps per phase.
   Keyed spans re-run the entrance animation when the folio turns. */
const FOLIO: Record<string, [string, string]> = {
  intro: ['Museum of Days · Nocturnal Register', 'fol. 1'],
  choose: ['Admissions — One Visitor', 'fol. 1 verso'],
  journal: ['Field Notes — Three Lines, Unedited', 'fol. 2'],
  confirm: ['Provisional Reading — Subject to the Night', 'fol. 2 verso'],
  dissolve: ['Pigment in Suspension — Do Not Disturb', 'fol. 3'],
  reveal: ['New Acquisition', 'fol. 3 verso'],
  museum: ['Hall of the Same Feeling · Wing II', 'fol. 4'],
  crisis: ['The Quiet Room — Someone Is Near', 'fol. —'],
  resting: ['The Museum Rests — Walls Still Warm', 'fol. —'],
}

export default function ArchiveChrome({ phase }: { phase: string }) {
  const [head, folio] = FOLIO[phase] ?? FOLIO.intro
  // the page is statically prerendered, so the date must be stamped after mount —
  // baking it into server HTML hydration-mismatches the moment the calendar turns
  const [stamp, setStamp] = useState('')
  useEffect(() => {
    const now = new Date()
    setStamp(`${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()} · N${now.getFullYear() % 100}`)
  }, [])
  return (
    <div className="arch-chrome" aria-hidden>
      <span key={head} className="arch-note arch-tl reveal">{head}</span>
      <span key={folio} className="arch-note arch-tr reveal">{folio}</span>
      <span className="arch-note arch-note--faint arch-bl">est. mmxxvi — open after dark</span>
      <span className="arch-note arch-note--faint arch-br">{stamp}</span>
    </div>
  )
}
