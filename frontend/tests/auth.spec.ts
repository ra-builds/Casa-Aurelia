import { expect } from '@playwright/test'
import { test, watchPageErrors } from './helpers/fixtures'
import { e2eAdminEmail, loginViaUi } from './helpers/auth'

// Authentication E2E scenarios exercised against the disposable backend
// (backend/run_e2e.py) started by the Playwright webServer — never against the
// development database.
test.describe('authentication', () => {
  test('login: valid admin credentials reach the dashboard', async ({ page }) => {
    const errors = watchPageErrors(page)

    await loginViaUi(page)
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()

    // The access token is kept in memory only (src/utils/authToken.ts) — it must
    // never be persisted to web storage.
    const stored = await page.evaluate(() => Object.keys(localStorage))
    expect(stored.filter((key) => /token|access|auth/i.test(key))).toEqual([])

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('login: wrong password is rejected with an error', async ({ page }) => {
    const errors = watchPageErrors(page)

    await page.goto('/admin')
    await page.locator('#admin-email').fill(e2eAdminEmail())
    await page.locator('#admin-password').fill('definitely-not-the-password')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('Invalid credentials')
    await expect(page.locator('#admin-email')).toBeVisible()

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('session: refresh cookie restores the session after a full reload', async ({ page }) => {
    const errors = watchPageErrors(page)

    await loginViaUi(page)
    // The access token lives in JS memory only; a reload wipes it, so the
    // HttpOnly refresh cookie must transparently restore the session.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
    await expect(page.getByText(e2eAdminEmail(), { exact: true })).toBeVisible()
    await expect(page.locator('#admin-email')).toHaveCount(0)

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('logout: clears the session and the refresh cookie', async ({ page }) => {
    const errors = watchPageErrors(page)

    await loginViaUi(page)
    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page.locator('#admin-email')).toBeVisible({ timeout: 10_000 })

    const cookies = await page.context().cookies()
    expect(cookies.find((cookie) => cookie.name === 'casaaurelia_refresh')).toBeUndefined()

    // Without the cookie a reload must NOT restore the session.
    await page.reload()
    await expect(page.locator('#admin-email')).toBeVisible()
    await expect(page.getByText(e2eAdminEmail(), { exact: true })).toHaveCount(0)

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })
})