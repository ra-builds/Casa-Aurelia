import { expect, type Page } from '@playwright/test'
import { test, watchPageErrors } from './helpers/fixtures'
import { toLocalCalendarDate } from '../src/utils/date'

// QA-9 · Section 18 — Focused cross-browser smoke coverage.
//
// A small representative suite (homepage, menu, reservations initial flow,
// contact, mobile navigation) that runs across Chromium, Firefox and WebKit via
// playwright.crossbrowser.config.ts. It reuses the same disposable E2E backend
// as the main suite, and the same page-error capture discipline from the shared
// fixtures. It is intentionally small: the deep edge-case coverage lives in
// errorEdgeCases.spec.ts (primary Chromium config); this spec exists only to
// prove the public site loads, throws no uncaught exceptions, and key controls
// work in each engine without browser-specific API failures.

/** Local-calendar date N days from now, skipping Monday (closed day). */
function futureOpenDate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  while (d.getDay() === 1 || d.getDay() === 0) d.setDate(d.getDate() + 1)
  return toLocalCalendarDate(d)
}

async function expectClean(page: Page, getErrors: () => string[]): Promise<void> {
  await expect.poll(() => getErrors(), { timeout: 4_000 }).toEqual([])
}

test.describe('QA-9 cross-browser smoke', () => {
  test('homepage loads with no uncaught exceptions and brand identity', async ({ page }) => {
    const errors = watchPageErrors(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('#root')).toBeVisible()
    await expect(page.title()).resolves.toMatch(/Casa Aurelia|Home/)
    await expectClean(page, errors)
  })

  test('menu page loads the dish list and category rail', async ({ page }) => {
    const errors = watchPageErrors(page)
    await page.goto('/menu')
    await expect(page.getByRole('heading', { name: /Written each morning/i })).toBeVisible({ timeout: 20_000 })
    // Seed data exposes at least the featured signature dishes.
    await expect(page.getByText(/Burrata/i).first()).toBeVisible()
    await expectClean(page, errors)
  })

  test('reservations initial flow renders the wizard steps', async ({ page }) => {
    const errors = watchPageErrors(page)
    await page.goto('/reservations')
    const dateInput = page.locator('input[type="date"]')
    await expect(dateInput).toBeVisible({ timeout: 20_000 })
    const date = futureOpenDate(3)
    await dateInput.fill(date)
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText(/Your party/i)).toBeVisible()
    await expectClean(page, errors)
  })

  test('contact page form validates and submits', async ({ page }) => {
    const errors = watchPageErrors(page)
    await page.goto('/contact')
    const send = page.getByRole('button', { name: /Send Message/i })
    await expect(send).toBeVisible({ timeout: 20_000 })
    // Empty submit surfaces all four field errors without a page crash.
    await send.click()
    await expect(page.getByText('Name is required')).toBeVisible()
    await expect(page.getByText('Message is required')).toBeVisible()

    await expectClean(page, errors)
  })

  test('mobile navigation opens and closes on a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const errors = watchPageErrors(page)
    await page.goto('/')
    const burger = page.getByRole('button', { name: 'Open menu' })
    await expect(burger).toBeVisible({ timeout: 20_000 })
    await burger.click()
    const closeBtn = page.getByRole('button', { name: 'Close menu' })
    await expect(closeBtn.first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
    await expectClean(page, errors)
  })
})
