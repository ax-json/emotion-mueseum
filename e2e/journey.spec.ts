import { test, expect } from '@playwright/test'

/* The front door now opens on an intro title, then a two-door choice screen. */
async function reachJournal(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Step Inside' }).click()
  await page.getByRole('button', { name: /Write a Journal Entry/ }).click()
  await expect(page.getByPlaceholder(/No one will read/)).toBeVisible({ timeout: 10000 })
}

test('intro → choice → journal → confirm → painting hangs → museum', async ({ page }) => {
  await reachJournal(page)
  await page.getByPlaceholder(/No one will read/).fill('rough morning, warm lunch with a friend, quiet lonely night')
  await page.getByRole('button', { name: 'Let it go' }).click()
  await expect(page.getByText('We heard:')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Yes, that was my day' }).click()
  await expect(page.getByRole('button', { name: /Hang it in the Museum/ })).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: /Hang it in the Museum/ }).click()
  await expect(page.locator('canvas').first()).toBeVisible()
})

test('crisis entry → resource card, no painting', async ({ page }) => {
  await reachJournal(page)
  await page.getByPlaceholder(/No one will read/).fill('MOCKCRISIS')
  await page.getByRole('button', { name: 'Let it go' }).click()
  await expect(page.getByText(/not alone/i)).toBeVisible({ timeout: 15000 })
})
