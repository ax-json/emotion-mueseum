# Higgsfield prompt — landing-page soul overlay

Animated overlay for the intro/landing screen. Generate as a short seamless video loop
(GIF banding kills these gradients — prefer mp4/webm, convert to GIF only if required).

## Main prompt (text-to-video)

> An abstract spiritual animation on a pure black background. A single eternal soul,
> rendered as a slow-breathing wisp of warm candlelight — molten gold and soft ivory —
> floats alone in vast darkness. It slowly unravels into fine threads of luminous pigment,
> like ink dissolving in water filmed in reverse. The threads bloom into faint halos of
> muted emotion colors — dusky rose, deep amber, moss green, twilight blue — that surface
> and fade like feelings being remembered, then gently fold back into the single
> flame-like orb. Tiny motes of golden dust rise around it like embers drifting through a
> night museum. Painterly texture: old-master oil paint, chiaroscuro, visible brushstrokes
> suspended in fluid. Movement is extremely slow and meditative, breathing on a
> four-second rhythm. No faces, no figures, no text, no hard geometry. The edges of the
> frame fall into complete darkness, so the light feels held inside a vast dark room.
> Seamless loop — the final frame matches the first.

## Short variant (if the model over-literalizes)

> A breathing orb of candle-gold light dissolving into painterly threads of pigment on
> pure black, embers of gold dust rising, chiaroscuro oil-paint texture, slow meditative
> loop, abstract, no faces, no text, seamless loop.

## Settings

- Aspect: 16:9 (full-bleed hero) or 1:1 (medallion above the title)
- Duration: 5–8 s, loop
- Avoid: faces, figures, text, watermark, lens flare, fast motion, hard edges

## Integration note

Render keeps a **pure black background** on purpose: overlay with
`mix-blend-mode: screen; pointer-events: none; opacity: .55–.7` and black disappears,
only the light lands on top of `LiquidBackground` — no alpha channel needed.
Palette anchors: bg `#0e0d0b`, gold `#c9a86a`, ivory `#e8e2d6` (matches globals.css).
