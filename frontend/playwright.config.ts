import { defineConfig, devices } from '@playwright/test'
import { join } from 'node:path'

// Frontend port the browser talks to. The Vite proxy forwards /api to the
// disposable E2E backend, which therefore always listens on BACKEND_PORT — the
// proxy target baked into vite.config.ts (which must not be changed).
const PORT = Number(process.env.E2E_PORT ?? 5174)
const BACKEND_PORT = 8000

// Absolute, quoted paths (repo path contains spaces) to the backend launcher.
// Local dev on Windows uses backend/venv/Scripts/python.exe; on Linux CI, where
// backend dependencies are installed with `pip install` (no venv), fall back to
// the PATH `python`. Override with E2E_PYTHON when a specific interpreter is
// required.
const E2E_PYTHON =
  process.env.E2E_PYTHON ??
  (process.platform === 'win32'
    ? join(process.cwd(), '..', 'backend', 'venv', 'Scripts', 'python.exe')
    : 'python')
const E2E_SCRIPT = join(process.cwd(), '..', 'backend', 'run_e2e.py')

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'html',

  use: {
    baseURL: `http://localhost:${PORT}`,
    // Pin the browser locale so the UI renders in English and text-based
    // selectors ("Sign In", "Logout", "Staff Login", "Admin Dashboard") stay
    // deterministic regardless of the host machine's locale.
    locale: 'en-US',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /* Future: uncomment when browsers are installed
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */
  ],

  webServer: [
    {
      command: `npm run dev -- --port ${PORT} --strictPort`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      // Disposable E2E backend (backend/run_e2e.py) against a throwaway SQLite
      // DB. reuseExistingServer is ALWAYS false: a real dev backend already
      // bound to the port must never be silently adopted by E2E tests.
      command: `"${E2E_PYTHON}" "${E2E_SCRIPT}" --port ${BACKEND_PORT}`,
      port: BACKEND_PORT,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        ...process.env,
        E2E_FRONTEND_PORT: String(PORT),
      },
    },
  ],

  outputDir: './test-results',
})
