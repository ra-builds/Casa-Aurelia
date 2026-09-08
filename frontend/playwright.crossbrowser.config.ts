import { defineConfig, devices } from '@playwright/test'
import { join } from 'node:path'

// Focused cross-browser smoke configuration (QA-9, Section 18).
//
// This deliberately does NOT run the full 77+ test suite against every browser.
// The main config (playwright.config.ts) keeps Chromium as the primary browser
// for the deep suite; this config runs ONLY the small representative smoke spec
// across Chromium, Firefox, and WebKit against the same disposable E2E backend.
//
// Ports and the backend launcher mirror the primary config so the Vite proxy
// still forwards /api to the disposable backend on BACKEND_PORT (the proxy
// target baked into vite.config.ts, which must not be changed).

const PORT = Number(process.env.E2E_PORT ?? 5176)
const BACKEND_PORT = 8000

// Local dev on Windows uses backend/venv/Scripts/python.exe; on Linux CI, where
// backend dependencies are installed with `pip install` (no venv), fall back to
// the PATH `python`. Override with E2E_PYTHON when a specific interpreter is
// required. (Same resolution as the primary config.)
const E2E_PYTHON =
  process.env.E2E_PYTHON ??
  (process.platform === 'win32'
    ? join(process.cwd(), '..', 'backend', 'venv', 'Scripts', 'python.exe')
    : 'python')
const E2E_SCRIPT = join(process.cwd(), '..', 'backend', 'run_e2e.py')

export default defineConfig({
  testDir: './tests',
  testMatch: '**/crossBrowserSmoke.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,

  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'en-US',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: [
    {
      command: `npm run dev -- --port ${PORT} --strictPort`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
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

  outputDir: './test-results/crossbrowser',
})
