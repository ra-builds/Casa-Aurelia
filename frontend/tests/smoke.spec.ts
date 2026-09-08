import { test, expect } from '@playwright/test'

test('app root loads without fatal navigation failure', async ({ page }) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (err) => pageErrors.push(err))

  await page.goto('/')
  await expect(page).toHaveURL('/')
  await expect(page).toHaveTitle(/Casa Aurelia/)

  const root = page.locator('#root')
  await expect(root).toBeVisible()

  expect(pageErrors).toEqual([])
})
