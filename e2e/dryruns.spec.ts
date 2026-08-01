import { test, expect, type Page } from '@playwright/test'

/* Ten dry runs across the museum's rooms. Every browser scenario also collects
   console errors + uncaught page errors and fails if any real one appears. */

const BENIGN = [
  /favicon/i,                      // no favicon shipped yet
  /net::ERR_/i,                    // offline supabase/CDN fetches surface as resource errors
  /Failed to load resource/i,      // same class — resource-level, not app-level
]

function trackErrors(page: Page) {
  const errs: string[] = []
  page.on('pageerror', e => errs.push(`pageerror: ${e.message}`))
  page.on('console', m => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (BENIGN.some(re => re.test(t))) return
    errs.push(`console: ${t}`)
  })
  return errs
}

async function reachJournal(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Step Inside' }).click()
  await page.getByRole('button', { name: /Write a Journal Entry/ }).click()
  await expect(page.getByPlaceholder(/No one will read/)).toBeVisible({ timeout: 10000 })
}

const HOME = /Return to the Entrance/

test('run 1: full happy journey, home link on every phase', async ({ page }) => {
  const errs = trackErrors(page)
  await page.goto('/')
  // intro is the entrance — no home link there
  await expect(page.getByText(HOME)).toHaveCount(0)
  await page.getByRole('button', { name: 'Step Inside' }).click()
  await expect(page.getByText(HOME)).toBeVisible()            // choose
  await page.getByRole('button', { name: /Write a Journal Entry/ }).click()
  await expect(page.getByText(HOME)).toBeVisible()            // journal
  await page.getByPlaceholder(/No one will read/).fill('rough morning, warm lunch with a friend, quiet lonely night')
  await page.getByRole('button', { name: 'Let it go' }).click()
  await expect(page.getByText('We heard:')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(HOME)).toBeVisible()            // confirm
  await page.getByRole('button', { name: 'Yes, that was my day' }).click()
  await expect(page.getByText(HOME)).toBeVisible()            // dissolve
  await expect(page.getByRole('button', { name: /Hang it in the Museum/ })).toBeVisible({ timeout: 30000 })
  await expect(page.getByText(HOME)).toBeVisible()            // reveal
  await page.getByRole('button', { name: /Hang it in the Museum/ }).click()
  await expect(page.locator('canvas').first()).toBeVisible()  // museum
  await expect(page.getByText(HOME)).toBeVisible()
  expect(errs).toEqual([])
})

test('run 2: crisis entry → resource card, home link leads back to intro', async ({ page }) => {
  const errs = trackErrors(page)
  await reachJournal(page)
  await page.getByPlaceholder(/No one will read/).fill('MOCKCRISIS')
  await page.getByRole('button', { name: 'Let it go' }).click()
  await expect(page.getByText(/not alone/i)).toBeVisible({ timeout: 15000 })
  await page.getByText(HOME).click()
  await expect(page.getByRole('button', { name: 'Step Inside' })).toBeVisible()
  expect(errs).toEqual([])
})

test('run 3: home from journal resets the visit (state cleared)', async ({ page }) => {
  const errs = trackErrors(page)
  await reachJournal(page)
  await page.getByPlaceholder(/No one will read/).fill('a half-written thought')
  await page.getByText(HOME).click()
  await expect(page.getByRole('button', { name: 'Step Inside' })).toBeVisible()
  await page.getByRole('button', { name: 'Step Inside' }).click()
  await page.getByRole('button', { name: /Write a Journal Entry/ }).click()
  await expect(page.getByPlaceholder(/No one will read/)).toHaveValue('')
  expect(errs).toEqual([])
})

test('run 4: home mid-dissolve aborts the ritual without a crash', async ({ page }) => {
  const errs = trackErrors(page)
  await reachJournal(page)
  await page.getByPlaceholder(/No one will read/).fill('calm walk, happy call, quiet night')
  await page.getByRole('button', { name: 'Let it go' }).click()
  await page.getByRole('button', { name: 'Yes, that was my day' }).click({ timeout: 15000 })
  await page.waitForTimeout(2000)                             // pigment mid-suspension
  await page.getByText(HOME).click()
  await expect(page.getByRole('button', { name: 'Step Inside' })).toBeVisible()
  await page.waitForTimeout(1500)                             // let any stray rAF/promise settle
  expect(errs).toEqual([])
})

test('run 5: empty and too-short entries cannot be submitted', async ({ page }) => {
  const errs = trackErrors(page)
  await reachJournal(page)
  await expect(page.getByRole('button', { name: 'Let it go' })).toBeDisabled()
  await page.getByPlaceholder(/No one will read/).fill('ab')
  await expect(page.getByRole('button', { name: 'Let it go' })).toBeDisabled()
  expect(errs).toEqual([])
})

test('run 6: 2000-char paste is capped at 600 and still paints', async ({ page }) => {
  const errs = trackErrors(page)
  await reachJournal(page)
  await page.getByPlaceholder(/No one will read/).fill('lonely then warm then hopeful '.repeat(67))
  const val = await page.getByPlaceholder(/No one will read/).inputValue()
  expect(val.length).toBeLessThanOrEqual(600)
  await page.getByRole('button', { name: 'Let it go' }).click()
  await expect(page.getByText('We heard:')).toBeVisible({ timeout: 15000 })
  expect(errs).toEqual([])
})

test('run 7: /about shows home link and it navigates to /', async ({ page }) => {
  const errs = trackErrors(page)
  await page.goto('/about')
  await expect(page.getByRole('heading', { name: 'A Museum of Days' })).toBeVisible()
  await page.getByText(HOME).click()
  await expect(page.getByRole('button', { name: 'Step Inside' })).toBeVisible()
  expect(errs).toEqual([])
})

test('run 8: /museum renders and its home link returns to /', async ({ page }) => {
  const errs = trackErrors(page)
  await page.goto('/museum')
  // main is zero-height (all children are position:fixed) — assert on the real furniture
  await expect(page.getByText('← Write About Your Day')).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('link', { name: 'About', exact: true })).toBeVisible()
  await page.getByText('← Write About Your Day').click()
  await expect(page.getByRole('button', { name: 'Step Inside' })).toBeVisible({ timeout: 10000 })
  expect(errs).toEqual([])
})

test('run 9: API dry run — malformed, valid, and repeated paints all answer politely', async ({ request }) => {
  // journal rejects garbage
  const bad = await request.post('/api/journal', { data: { text: '' } })
  expect(bad.ok()).toBeTruthy()
  expect((await bad.json()).status).toBe('rejected')
  // paint rejects malformed beats
  const malformed = await request.post('/api/paint', { data: { beats: [{ nonsense: true }] } })
  expect(malformed.ok()).toBeTruthy()
  expect((await malformed.json()).status).toBe('rejected')
  // 4 rapid paints, one session — every answer is a known status, never a 500
  const beats = [
    { word: 'lonely', emotion: 'loneliness', intensity: 0.6 },
    { word: 'warm', emotion: 'love', intensity: 0.7 },
    { word: 'quiet', emotion: 'calm', intensity: 0.4 },
  ]
  const seen: string[] = []
  for (let i = 0; i < 4; i++) {
    const r = await request.post('/api/paint', {
      data: { beats, text: 'dry run day' },
      headers: { 'x-session-id': 'dryrun-session-9' },
    })
    expect(r.ok()).toBeTruthy()
    seen.push((await r.json()).status)
  }
  for (const s of seen) expect(['ok', 'solo', 'limited', 'resting']).toContain(s)
})

test('run 10: mobile viewport walkthrough (390×844, touch)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  const errs = trackErrors(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Step Inside' }).click()
  await expect(page.getByText(HOME)).toBeVisible()
  await page.getByRole('button', { name: /Write a Journal Entry/ }).click()
  await expect(page.getByPlaceholder(/No one will read/)).toBeVisible({ timeout: 10000 })
  await page.goto('/museum')
  await expect(page.getByText('← Write About Your Day')).toBeVisible({ timeout: 10000 })
  expect(errs).toEqual([])
  await ctx.close()
})
