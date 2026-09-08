import { test as base, expect, type Page } from '@playwright/test'
import { loginViaUi } from './auth'

/**
 * Shared E2E fixtures.
 *
 * `test` is the single test declaration source — always import it from here so
 * new fixtures stay additive and are applied uniformly.
 */
export const test = base.extend<{ authenticatedAdminPage: Page }>({
  /** A page already signed in to the admin dashboard via the real login UI. */
  authenticatedAdminPage: async ({ page }, commit) => {
    await loginViaUi(page)
    await commit(page)
  },
})

export { expect }

// --- Unexpected error capture ----------------------------------------------
// Various network-level console lines are expected side effects of the auth
// flows under test (a 401 from an unauthenticated /api/auth/refresh, a 401 from
// a bad-password login attempt, and the browser's no-favicon 404). They are
// filtered while genuine JavaScript exceptions (pageerror) always fail tests.
const BENIGN_CONSOLE_ERROR_PATTERNS: RegExp[] = [
  /Failed to load resource: the server responded with a status of 401/i,
  /Failed to load resource: the server responded with a status of 404/i,
  /favicon/i,
]

/**
 * Starts collecting unexpected page and console errors for the given page and
 * returns a getter that resolves to the collected entries so far.
 * Tests should finish with `await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])`.
 * `extraBenign` lets a test that deliberately provokes a failure (a simulated
 * 500/503/aborted response, or third-party image flakiness) suppress exactly those
 * expected browser "Failed to load resource" lines while still failing on any
 * genuine JavaScript exception (pageerror) or unexpected console error.
 */
export function watchPageErrors(page: Page, extraBenign: RegExp[] = []): () => string[] {
  const benign = [...BENIGN_CONSOLE_ERROR_PATTERNS, ...extraBenign]
  const observed: string[] = []
  page.on('pageerror', (err) => observed.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (benign.some((pattern) => pattern.test(text))) return
    observed.push(`console.error: ${text}`)
  })
  return () => observed
}