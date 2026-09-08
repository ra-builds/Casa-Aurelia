import { expect, type APIRequestContext, type Page } from '@playwright/test'

/**
 * E2E authentication helper foundation.
 * Credentials are read from environment variables ONLY — never committed to source.
 *
 * Set these before running Playwright tests:
 *   E2E_ADMIN_EMAIL     - admin login email for the running backend
 *   E2E_ADMIN_PASSWORD  - admin login password for the running backend
 */
export const e2eAdminEmail = (): string => {
  const value = process.env.E2E_ADMIN_EMAIL
  if (!value) {
    throw new Error('E2E_ADMIN_EMAIL environment variable is not set')
  }
  return value
}

export const e2eAdminPassword = (): string => {
  const value = process.env.E2E_ADMIN_PASSWORD
  if (!value) {
    throw new Error('E2E_ADMIN_PASSWORD environment variable is not set')
  }
  return value
}

export interface AdminSession {
  accessToken: string
}

/**
 * Obtain an admin access token against the running backend.
 * Returns the access token from the login body; the refresh token is stored
 * in an HttpOnly cookie and is NOT exposed here.
 */
export async function adminLogin(api: APIRequestContext): Promise<AdminSession> {
  const response = await api.post('/api/auth/login', {
    data: {
      email: e2eAdminEmail(),
      password: e2eAdminPassword(),
    },
  })
  if (!response.ok()) {
    throw new Error(`adminLogin failed: ${response.status()} ${await response.text()}`)
  }
  const body = (await response.json()) as { access_token: string }
  return { accessToken: body.access_token }
}

/**
 * Logs into the admin area as the E2E admin user through the real UI form
 * (AdminPage LoginForm). Credentials come exclusively from E2E_ADMIN_EMAIL /
 * E2E_ADMIN_PASSWORD.
 *
 * Assumes the disposable backend started by the Playwright webServer and the
 * pinned en-US locale (see playwright.config.ts).
 */
export async function loginViaUi(page: Page): Promise<void> {
  await page.goto('/admin')
  await page.locator('#admin-email').fill(e2eAdminEmail())
  await page.locator('#admin-password').fill(e2eAdminPassword())
  await page.getByRole('button', { name: 'Sign In' }).click()
  // Once authenticated the login form unmounts and the dashboard header shows
  // the signed-in user's email.
  await expect(page.locator('#admin-email')).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByText(e2eAdminEmail(), { exact: true })).toBeVisible({ timeout: 15_000 })
}