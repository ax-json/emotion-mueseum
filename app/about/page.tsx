import HomeLink from '@/components/HomeLink'

export const metadata = { title: 'About — The Emotion Museum' }

export default function About() {
  return (
    <main className="stagger" style={{ maxWidth: 620, margin: '12vh auto', padding: '0 1.4rem', lineHeight: 1.75, position: 'relative', zIndex: 2 }}>
      <HomeLink />
      <h1 style={{ marginBottom: '1.6rem' }}>A Museum of Days</h1>
      <p style={{ marginBottom: '1.4rem' }}>
        Technology gets blamed for making us lonely. We used it to let strangers find each other
        through feelings, not faces. You tell the museum about your day; your feelings become a
        painting; the painting hangs beside people who felt the same — no names, no likes, no
        profiles. Only color remains.
      </p>
      <h2 style={{ margin: '2rem 0 .8rem' }}>Your Words</h2>
      <p style={{ marginBottom: '1.4rem' }}>
        Your journal entry is analyzed in memory and never stored — the database has no column for
        it. What persists is the painting: three feeling-words, an emotion fingerprint, and color.
        If an entry sounds like a night heavier than paint can hold, the museum quietly offers
        helpline resources instead of a painting.
      </p>
      <h2 style={{ margin: '2rem 0 .8rem' }}>The Founding Collection</h2>
      <p className="plaque" style={{ marginBottom: '1.4rem' }}>
        The first paintings, marked “founding collection”, are the builder’s own honest days —
        disclosed seeds, never fake strangers.
      </p>
      <p>
        <a href="/" style={{ color: 'var(--accent)' }}>Tell the museum about your day →</a><br />
        <a href="/museum" style={{ color: 'var(--accent)' }}>Walk the halls →</a><br />
        <a href="https://github.com" style={{ color: 'var(--dim)' }}>Source on GitHub</a>
      </p>
    </main>
  )
}
