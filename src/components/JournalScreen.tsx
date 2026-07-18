'use client'
import { useRef, useState } from 'react'
import type { ArcBeat } from '@/lib/emotion'
import { getSessionId } from '@/lib/session'

export default function JournalScreen({ onArc, onCrisis, onResting }: {
  onArc: (beats: ArcBeat[], rawText: string) => void; onCrisis: () => void; onResting: () => void
}) {
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [gentle, setGentle] = useState('')
  const [listening, setListening] = useState(false)
  const recRef = useRef<{ stop: () => void } | null>(null)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const SR = typeof window !== 'undefined' ? ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition) : null

  function toggleMic() {
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const rec = new SR()
    rec.interimResults = false; rec.continuous = true
    rec.onresult = (e: any) => {
      let final = ''
      for (const r of e.results) if (r.isFinal) final += r[0].transcript + ' '
      if (final) setText(t => (t + ' ' + final).trim().slice(0, 600))
    }
    rec.onend = () => setListening(false)
    recRef.current = rec; rec.start(); setListening(true)
  }
  async function submit() {
    if (text.trim().length < 3 || busy) return
    setBusy(true)
    const res = await fetch('/api/journal', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': getSessionId() },
      body: JSON.stringify({ text }),
    }).then(r => r.json()).catch(() => null)
    setBusy(false)
    if (!res) return setGentle('the museum is far away tonight — try once more?')
    if (res.status === 'crisis') return onCrisis()
    if (res.status === 'resting') return onResting()
    if (res.status === 'limited') return setGentle('the museum asks you to rest a while — come back in an hour')
    if (res.status === 'rejected') return setGentle("the museum couldn't hear that — try again?")
    onArc(res.beats, text)
  }
  return (
    <section style={{ maxWidth: 560, margin: '18vh auto 0', padding: '0 1.2rem' }}>
      <h1 style={{ fontWeight: 400, marginBottom: '1.4rem' }}>how was your day, really?</h1>
      <textarea value={text} onChange={e => setText(e.target.value.slice(0, 600))} rows={6} autoFocus
        style={{ width: '100%', background: 'transparent', color: 'var(--ink)', border: '1px solid #2a2822', padding: '1rem', font: 'inherit', fontSize: '1.05rem' }}
        placeholder="no one will read this. not even us." />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.9rem', alignItems: 'center', gap: '.8rem' }}>
        <span className="plaque">{gentle || `${text.length}/600`}</span>
        {SR && (
          <button onClick={toggleMic} aria-label="speak instead"
            style={{ background: 'none', border: '1px solid #2a2822', color: listening ? 'var(--accent)' : 'var(--dim)', padding: '.55rem .9rem' }}>
            {listening ? 'listening — tap to stop' : '🎙 speak'}
          </button>
        )}
        <button onClick={submit} disabled={busy || text.trim().length < 3}
          style={{ background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '.55rem 1.4rem' }}>
          {busy ? 'listening…' : 'let it go'}
        </button>
      </div>
    </section>
  )
}
