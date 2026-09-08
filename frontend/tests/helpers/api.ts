/**
 * Lightweight API helper foundation.
 * Provides the configured backend base URL for future E2E tests that need to
 * communicate with the backend directly (setup/teardown, admin operations).
 */

/**
 * Returns the backend base URL for direct API calls.
 * Defaults to the Playwright baseURL (the frontend dev server, which proxies
 * /api to the backend in dev mode). Override with E2E_API_URL to hit the
 * backend directly.
 */
export function apiBaseURL(playwrightBaseURL?: string): string {
  return process.env.E2E_API_URL ?? playwrightBaseURL ?? 'http://localhost:5173'
}

/**
 * Assert a response is 2xx or throw with the response body for a
 * deterministic failure message in future tests.
 */
export async function expectOk(response: {
  ok: () => boolean
  status: () => number
  text: () => Promise<string>
}): Promise<void> {
  if (!response.ok()) {
    throw new Error(`Expected 2xx, got ${response.status()}: ${await response.text()}`)
  }
}
