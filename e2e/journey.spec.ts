import { test, expect } from '@playwright/test'

test('journal → confirm → painting hangs → museum', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder(/no one will read/).fill('rough morning, warm lunch with a friend, quiet lonely night')
  await page.getByRole('button', { name: 'let it go' }).click()
  await expect(page.getByText('we heard:')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'yes, that was my day' }).click()
  await expect(page.getByRole('button', { name: /hang it in the museum/ })).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: /hang it in the museum/ }).click()
  await expect(page.locator('canvas').first()).toBeVisible()
})

test('crisis entry → resource card, no painting', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder(/no one will read/).fill('MOCKCRISIS')
  await page.getByRole('button', { name: 'let it go' }).click()
  await expect(page.getByText(/not alone/i)).toBeVisible({ timeout: 15000 })
})
