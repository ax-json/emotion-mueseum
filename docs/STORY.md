# Museum of Days

*Strangers finding each other through feelings, not faces.*

## Inspiration

Technology keeps getting blamed for loneliness, and for a hackathon about the arts I wanted to argue the other way. The most honest art most of us make is the way we describe a day to ourselves, and nobody ever hangs it anywhere. So: a museum where your day becomes a painting, and it hangs beside the days of strangers who felt the same as you.

I longlisted ten ideas and pressure tested them before writing any code. Two decisions from that review shaped everything after. A song mode got cut for scope, and synthetic strangers got banned outright. If the museum feels alive, it has to actually be alive. The first fifteen paintings are my own days, plaqued as the founding collection, and every painting after that is a real person.

## What it does

You write (or speak) three honest lines about your day. An AI reads the emotional arc and hands it back as three plain words you can correct with one tap. Then it paints one canvas from your evening while your words visibly dissolve into the pigment. The dissolve doubles as the loading screen and as the promise: the museum keeps the feeling and lets go of the words.

Your painting hangs in a walkable 3D museum at night. Each entry becomes an eight number emotion vector, and your neighbors are chosen by cosine similarity:

$$\text{sim}(a, b) = \frac{a \cdot b}{\lVert a \rVert\,\lVert b \rVert}, \qquad a, b \in \mathbb{R}^8$$

Placement is math you can feel. Valence $v \in [-1, 1]$ decides where along the wall you hang and arousal $\alpha \in [0, 1]$ decides how high. Heavy quiet days hang low on one side, bright electric days hang high on the other. You can leave an anonymous light under a stranger's painting, and every visitor's feelings feed one communal mural that repaints itself as new entries arrive, so tonight's mural has never existed before and will never exist again.

Privacy is structural rather than a policy page. There is no column for your words. The database stores three feeling words, eight floats, valence, arousal, image URLs, and a salted session hash. Nothing else exists to leak. Entries that signal a crisis skip the painting flow entirely and get a gentle helpline card instead, decided on the server with no client override.

## How I built it

Next.js 15 and React 19, with React Three Fiber for the museum itself. Supabase covers Postgres, Storage, and Realtime, so a stranger's painting can appear on the wall while you stand there watching. Image generation sits behind a provider abstraction (a free keyless painter by default, three paid providers, and a mock for tests), and a ChatGPT prompt smith art directs each canvas in a fixed house style: dark glitch collage, one tender subject half consumed by digital corruption. Its output gets rejected if it names any feeling word or echoes four consecutive words from the diary, because diary text must never reach an image provider's logs. Every AI call has a deterministic local fallback, so a painting always happens.

Each visit rolls one of five environments, from a classic walled hall to a starfield where frames orbit a letter tree, and the AI's reading of your day tunes the weather: light, fog, and dust shift with your valence and arousal. The whole flow is guarded by 59 unit tests, a Playwright journey suite, and ten scripted dry runs covering the crisis path, abuse, rate limits, and mobile.

## Challenges

**The iced coffee incident.** The image model obeys the first words of a prompt far more than the rest. Prompts that opened with the subject produced clean product photography, and one diary about a cold drink came back looking like an ad for iced coffee. Prompts that open with the style school produce actual art. One A/B test, one reordering rule, and the museum looked like a museum.

**Lighting, three times.** Three separate nights I fought dark walls. Chasing them with point lights kept losing to physical light falloff in a room fifteen meters deep. The fix that finally stuck: every canvas emits its own image as light, like a backlit painting, readable on any wall of any environment with zero extra lights.

**Thirteen frames per second.** The intro ran at 13fps and I refused to guess why. I built a toggle matrix, hid one layer at a time, and measured. The culprits were five giant blurred blobs and a cursor light that repainted the whole viewport every frame; both were rebuilt as transform only compositor work. Along the way I learned Chrome throttles occluded windows, so deltas between toggles are the signal and absolute frame numbers lie.

**The red squares.** Mock test runs had quietly uploaded 1×1 red pixels to the production database, and the museum stretched them into half meter red squares on real walls. The fix rejects any texture two pixels or smaller and paints a deterministic particle artwork instead. That became the house rule: failures resolve to art. Generation fails, you get particles. Database down, your painting lives on your device tonight. Daily cap hit, the museum is resting.

**A race on the communal mural.** An adversarial review pass found that concurrent visitors could each trigger a paid mural regeneration, and two cleanup sweeps could delete each other's fresh mural and leave the museum with none. The rewrite claims the work atomically with a conditional update, so exactly one caller wins per window no matter the traffic.

## What I learned

Measure before optimizing, and trust deltas over absolutes. Word order is a real API surface in diffusion prompts. Privacy holds up best when it is checkable, and the easiest thing to check is a schema with nothing sensitive in it. And the rule I want to keep for every future project: a person who came to you with a feeling should never be handed an error screen.

## What's next

A proper demo film, a funded image provider for the denser collage look the house style wants, and a small memory so two visits in a row never roll the same environment.
