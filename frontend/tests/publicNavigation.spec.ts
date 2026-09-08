import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { test, watchPageErrors } from './helpers/fixtures'
import { adminLogin } from './helpers/auth'
import type { ContactMessage, Restaurant } from '../src/types'

// The restaurant-propagation test mutates the shared restaurant record for a
// moment; keeping this file serial prevents any cross-test interference.
test.describe.configure({ mode: 'serial' })

// Public-site & navigation E2E coverage (QA-6) exercised against the
// disposable backend (backend/run_e2e.py) started by the Playwright webServer —
// never against the development database.

let emailCounter = 0
function uniqueEmail(): string {
  emailCounter += 1
  return `qa6-${Date.now()}-${emailCounter}@example.org`
}

function uniqueSubject(prefix: string): string {
  return `${prefix} ${Date.now()}`
}

async function adminHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  const { accessToken } = await adminLogin(request)
  return { Authorization: `Bearer ${accessToken}` }
}

// Auth polling for a logged-out visitor is expected to receive 401 on
// /api/auth/refresh; any other non-2xx response is a regression.
function collectFailedRequests(page: Page): () => { url: string; status: number }[] {
  const failures: { url: string; status: number }[] = []
  page.on('requestfailed', (req) => failures.push({ url: req.url(), status: -1 }))
  page.on('response', (res) => {
    const isExpectedRefresh401 =
      res.status() === 401 && /\/api\/auth\/refresh$/.test(res.url())
    if (res.status() >= 400 && !isExpectedRefresh401 && !/favicon/i.test(res.url())) {
      failures.push({ url: res.url(), status: res.status() })
    }
  })
  return () => failures
}

test.describe('public site – public route coverage', () => {
  test('every public route renders its own content with an engineered <title>', async ({ page }) => {
    const errors = watchPageErrors(page)

    await page.goto('/')
    await expect(page).toHaveTitle('Casa Aurelia | Modern Italian Restaurant in Novara')
    await expect(page.getByRole('heading', { level: 1, name: /A table set/ })).toBeVisible()

    await page.goto('/menu')
    await expect(page).toHaveTitle('Menu | Casa Aurelia')
    await expect(page.getByRole('heading', { level: 1, name: 'Written each morning.' })).toBeVisible()

    await page.goto('/signatures')
    await expect(page).toHaveTitle('Signature Dishes | Casa Aurelia')
    await expect(page.getByRole('heading', { level: 1, name: /Dishes that remain/ })).toBeVisible()

    await page.goto('/about')
    await expect(page).toHaveTitle('About | Casa Aurelia')
    await expect(page.getByRole('heading', { level: 1, name: 'Our Story' })).toBeVisible()

    await page.goto('/gallery')
    await expect(page).toHaveTitle('Gallery | Casa Aurelia')
    await expect(page.getByRole('heading', { level: 1, name: 'A glimpse of the evening.' })).toBeVisible()

    await page.goto('/reservations')
    await expect(page).toHaveTitle('Reservations | Casa Aurelia')
    await expect(page.getByRole('heading', { level: 1, name: 'Reserve a Table' })).toBeVisible()

    await page.goto('/contact')
    await expect(page).toHaveTitle('Contact | Casa Aurelia')
    await expect(page.getByRole('heading', { level: 1, name: /A brass sign/ })).toBeVisible()

    await page.goto('/reservation-lookup')
    await expect(page).toHaveTitle('Manage Reservation | Casa Aurelia')
    await expect(page.getByRole('heading', { level: 1, name: 'Manage Reservation' })).toBeVisible()

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('the confirmation page without booking state redirects to the booking flow', async ({ page }) => {
    await page.goto('/reservation-confirmed')
    await expect(page).toHaveURL(/\/reservations$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Reserve a Table' })).toBeVisible()
  })

  test('an unknown route resolves to the soft-404 page without crashing', async ({ page }) => {
    const errors = watchPageErrors(page)

    await page.goto('/no-such-route')
    await expect(page).toHaveTitle('Page Not Found | Casa Aurelia')
    await expect(page.getByRole('heading', { level: 1, name: 'Page Not Found' })).toBeVisible()
    await expect(page.getByText('Back to Home')).toBeVisible()
    await expect(page.getByText('View Our Menu')).toBeVisible()

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })
})

test.describe('public site – navigation', () => {
  test('navbar links reach their destinations and mark the active page', async ({ page }) => {
    const errors = watchPageErrors(page)

    await page.goto('/')
    const nav = page.locator('header')

    await expect(nav.getByRole('link', { name: 'Our Story' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Signatures' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Menu', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Gallery' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Visit' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Reserve a Table' })).toBeVisible()

    await nav.getByRole('link', { name: 'Our Story' }).click()
    await expect(page).toHaveURL('/about')
    await expect(page.getByRole('heading', { level: 1, name: 'Our Story' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Our Story' })).toHaveAttribute('aria-current', 'page')

    await nav.getByRole('link', { name: 'Gallery' }).click()
    await expect(page).toHaveURL('/gallery')
    await expect(nav.getByRole('link', { name: 'Gallery' })).toHaveAttribute('aria-current', 'page')

    await nav.getByRole('link', { name: 'Reserve a Table' }).click()
    await expect(page).toHaveURL('/reservations')
    await expect(page.getByRole('heading', { level: 1, name: 'Reserve a Table' })).toBeVisible()

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('the mobile menu opens, navigates and closes via Escape and route change', async ({ page }) => {
    const errors = watchPageErrors(page)
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto('/')
    const toggle = page.getByRole('button', { name: 'Open menu' })
    await expect(toggle).toBeVisible()
    await toggle.click()
    const header = page.locator('header')
    const toggleOpen = header.locator('button[aria-expanded="true"]')
    await expect(toggleOpen).toHaveAttribute('aria-label', 'Close menu')
    await expect(toggleOpen).toHaveAttribute('aria-expanded', 'true')

    const inModal = page.locator('nav[aria-label="Main navigation"]').last()
    await expect(inModal.getByRole('link', { name: /Our Story/ })).toBeVisible()
    await expect(inModal.getByRole('link', { name: /Menu/ })).toBeVisible()
    await expect(inModal.getByRole('link', { name: 'Reserve a Table' })).toBeVisible()
    await expect
      .poll(async () => page.evaluate(() => document.body.style.overflow))
      .toBe('hidden')

    // Escape closes the menu and restores body scroll.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible({ timeout: 5_000 })
    await expect.poll(async () => page.evaluate(() => document.body.style.overflow)).toBe('')

    // Re-opening and following a link navigates and closes the menu.
    await page.getByRole('button', { name: 'Open menu' }).click()
    await inModal.getByRole('link', { name: 'Our Story' }).click()
    await expect(page).toHaveURL('/about')
    await expect(page.getByRole('heading', { level: 1, name: 'Our Story' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })
})

test.describe('public site – i18n', () => {
  test('switching to German updates the UI, persists across navigation and reload, and returns to English', async ({
    page,
  }) => {
    const errors = watchPageErrors(page)

    await page.goto('/')
    const selector = page.getByRole('button', { name: /select language|sprache auswählen/i })
    await selector.click()
    await page.getByRole('option', { name: 'Deutsch' }).click()

    await expect(selector).toContainText('de')
    await expect.poll(async () => page.evaluate(() => document.documentElement.lang)).toBe('de')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('restaurant_language'))).toBe('de')

    const nav = page.locator('header')
    await expect(nav.getByRole('link', { name: 'Speisekarte', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Galerie' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Unsere Geschichte' })).toBeVisible()

    // The selected locale persists across client-side navigation and a reload.
    await nav.getByRole('link', { name: 'Speisekarte', exact: true }).click()
    await expect(page).toHaveURL('/menu')
    await expect(page).toHaveTitle('Speisekarte | Casa Aurelia')
    await expect(page.getByRole('heading', { level: 1, name: /Täglich frisch geschrieben/ })).toBeVisible()
    await page.reload()
    await expect(page).toHaveTitle('Speisekarte | Casa Aurelia')
    await expect(selector).toContainText('de')
    await expect(page.getByRole('heading', { level: 1, name: /Täglich frisch geschrieben/ })).toBeVisible()

    // Return to English.
    await selector.click()
    await page.getByRole('option', { name: 'English' }).click()
    await expect(selector).toContainText('en')
    await expect.poll(async () => page.evaluate(() => document.documentElement.lang)).toBe('en')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('restaurant_language'))).toBe('en')
    await expect(page.getByRole('heading', { level: 1, name: 'Written each morning.' })).toBeVisible()

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })
})

test.describe('public site – menu', () => {
  test('the menu loads live seeded data with prices, signatures and working category tabs', async ({ page }) => {
    const errors = watchPageErrors(page)

    await page.goto('/menu')
    const menuResponse = page.waitForResponse(
      (r) => r.url().includes('/api/menu') && r.request().method() === 'GET',
    )
    await menuResponse
    await expect(page.getByRole('heading', { level: 1, name: 'Written each morning.' })).toBeVisible()

    // Seeded live data: an antipasto and a primo with their prices.
    await expect(page.getByRole('heading', { level: 3, name: 'Burrata Pugliese' })).toBeVisible()
    await expect(page.getByText('€16.00').first()).toBeVisible()
    const tagliatelle = page.getByRole('heading', { level: 3, name: 'Tagliatelle al Tartufo' })
    await expect(tagliatelle).toBeVisible()
    await expect(page.getByText('€28.00').first()).toBeVisible()
    await expect(page.getByText('Signature', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Spaghetti alle Vongole')).toBeVisible()

    // Category tabs filter the visible dishes.
    const tabs = page.getByRole('group', { name: 'Our Menu' })
    await tabs.getByRole('button', { name: 'Primi' }).click()
    await expect(tabs.getByRole('button', { name: 'Primi' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { level: 3, name: 'Tagliatelle al Tartufo' })).toBeVisible()
    await expect(page.getByText('Spaghetti alle Vongole')).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: 'Burrata Pugliese' })).toHaveCount(0)

    await tabs.getByRole('button', { name: 'Dolci' }).click()
    await expect(page.getByRole('heading', { level: 3, name: 'Tiramisù' })).toBeVisible()
    await expect(page.getByText('€12.00').first()).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: 'Burrata Pugliese' })).toHaveCount(0)

    await tabs.getByRole('button', { name: 'All' }).click()
    await expect(page.getByRole('heading', { level: 3, name: 'Burrata Pugliese' })).toBeVisible()

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })
})

test.describe('public site – signatures', () => {
  test('the signature journal renders featured dishes from the live menu', async ({ page }) => {
    const errors = watchPageErrors(page)

    await page.goto('/signatures')
    await expect(page.getByRole('heading', { level: 1, name: /Dishes that remain/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Only a handful of plates earn the table.' })).toBeVisible()

    await expect(page.getByRole('heading', { level: 2, name: 'Tagliatelle al Tartufo' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Aperol Spritz' })).toBeVisible()
    await expect(page.getByText('€28.00').first()).toBeVisible()
    await expect(page.getByText('Signature', { exact: true }).first()).toBeVisible()

    // Closing invitation CTAs.
    await expect(page.getByRole('link', { name: 'Reserve a table', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'View full menu' })).toBeVisible()

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })
})

test.describe('public site – gallery', () => {
  test('gallery filters by category and the lightbox opens, navigates with arrows and closes', async ({ page }) => {
    const errors = watchPageErrors(page)

    await page.goto('/gallery')
    await expect(page.getByRole('heading', { level: 1, name: 'A glimpse of the evening.' })).toBeVisible()

    const tabs = page.getByRole('group', { name: 'Browse the gallery by category' })
    const tiles = page.getByRole('button', { name: /^View / })
    await expect(tiles).toHaveCount(16)

    await tabs.getByRole('button', { name: 'Food' }).click()
    await expect(tabs.getByRole('button', { name: 'Food' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: /^View / })).toHaveCount(5)

    // Open the lightbox from the filtered set.
    await page.getByRole('button', { name: /^View / }).first().click()
    await expect(page.getByRole('dialog', { name: 'Image lightbox' })).toBeVisible()
    await expect(page.getByText('1 of 5', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Next image' }).click()
    await expect(page.getByText('2 of 5', { exact: true })).toBeVisible()

    await page.keyboard.press('ArrowLeft')
    await expect(page.getByText('1 of 5', { exact: true })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Image lightbox' })).toHaveCount(0)

    // Back to the full set.
    await tabs.getByRole('button', { name: 'All' }).click()
    await expect(page.getByRole('button', { name: /^View / })).toHaveCount(16)

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })
})

test.describe('public site – contact', () => {
  test('the contact page shows the live restaurant contact details and hours', async ({ page }) => {
    const errors = watchPageErrors(page)

    await page.goto('/contact')
    await expect(page.getByRole('heading', { level: 1, name: /A brass sign/ })).toBeVisible()

    await expect(page.getByText('Via Roma 42, 28100 Novara, Italy', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: '+39 0321 123 456' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'info@casaaurelia.it' }).first()).toBeVisible()
    await expect(page.getByText('12:00 – 14:00').first()).toBeVisible()
    await expect(page.getByText('19:00 – 22:00').first()).toBeVisible()
    await expect(page.getByText('Monday').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Instagram' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Facebook' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'TripAdvisor' }).first()).toBeVisible()

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('the contact form validates, rejects an invalid email, persists the message and sends no email', async ({
    page,
    request,
  }) => {
    const errors = watchPageErrors(page)
    const email = uniqueEmail()
    const subject = uniqueSubject('QA-6 table request')

    await page.goto('/contact')
    await expect(page.getByRole('heading', { name: 'Send a Message' })).toBeVisible()

    // Empty submission surfaces every required-field error.
    await page.getByRole('button', { name: 'Send Message' }).click()
    await expect(page.getByText('Name is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Subject is required')).toBeVisible()
    await expect(page.getByText('Message is required')).toBeVisible()

    // Invalid email is rejected specifically.
    await page.getByLabel('Name').fill('QA Tester')
    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Subject').fill(subject)
    await page.getByLabel('Message').fill('We would love a quiet corner table for two next week.')
    await page.getByRole('button', { name: 'Send Message' }).click()
    await expect(page.getByText('Invalid email address')).toBeVisible()

    // A valid submission succeeds and reports no real email (SMTP disabled).
    const submitResponse = page.waitForResponse(
      (r) => r.url().includes('/api/contact') && r.request().method() === 'POST',
    )
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Send Message' }).click()
    const submitted = await submitResponse
    expect(submitted.status()).toBe(201)
    const body = (await submitted.json()) as { id: number; stored: boolean; email_sent: boolean }
    expect(body.stored).toBe(true)
    expect(body.email_sent).toBe(false)

    await expect(
      page.getByText('Thank you! Your message has been sent. We will respond shortly.'),
    ).toBeVisible()
    await expect(page.getByLabel('Name')).toHaveCount(0)

    // The message is persisted and visible to the admin messages endpoint.
    const headers = await adminHeaders(request)
    const messagesRes = await request.get('/api/contact/messages', { headers })
    expect(messagesRes.ok()).toBeTruthy()
    const messages = (await messagesRes.json()) as ContactMessage[]
    const found = messages.find((m) => m.subject === subject && m.email === email)
    expect(found).toBeTruthy()
    expect(found?.message).toContain('quiet corner table')

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })
})

test.describe('public site – restaurant propagation', () => {
  test('restaurant changes via the admin API propagate to the public site, then are restored', async ({
    page,
    request,
  }) => {
    const errors = watchPageErrors(page)
    const originalRes = await request.get('/api/restaurant')
    expect(originalRes.ok()).toBeTruthy()
    const original = (await originalRes.json()) as Restaurant

    const NEW_CITY = 'QA6 Test Town'
    const NEW_PHONE = '+39 555 010 2030'
    const headers = await adminHeaders(request)
    const patchRes = await request.patch('/api/admin/restaurant', {
      headers,
      data: { city: NEW_CITY, phone: NEW_PHONE },
    })
    expect(patchRes.status()).toBe(200)
    const updated = (await patchRes.json()) as Restaurant
    expect(updated.city).toBe(NEW_CITY)
    expect(updated.phone).toBe(NEW_PHONE)

    try {
      // Home: brand line under the logo and footer phone reflect the change.
      await page.goto('/')
      await expect(page.getByText(`Ristorante · ${NEW_CITY}`).first()).toBeVisible()
      await expect(page.getByText(NEW_PHONE).first()).toBeVisible()

      // Contact: the tel link and address block reflect the change.
      await page.goto('/contact')
      await expect(page.getByRole('link', { name: NEW_PHONE })).toBeVisible()
      await expect(page.getByRole('heading', { level: 1, name: /A brass sign/ })).toBeVisible()
    } finally {
      // Restore the original values.
      const restoreRes = await request.patch('/api/admin/restaurant', {
        headers,
        data: { city: original.city, phone: original.phone },
      })
      expect(restoreRes.status()).toBe(200)
    }

    // The restoration is visible to the public site again.
    await page.goto('/')
    await expect(page.getByText(`Ristorante · ${original.city}`).first()).toBeVisible()
    await expect(page.getByText(original.phone).first()).toBeVisible()

    const checkRes = await request.get('/api/restaurant')
    const check = (await checkRes.json()) as Restaurant
    expect(check.city).toBe(original.city)
    expect(check.phone).toBe(original.phone)

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })
})

test.describe('public site – footer & deep links', () => {
  test('the footer surfaces business info, hours and safe external social links', async ({ page }) => {
    const errors = watchPageErrors(page)

    await page.goto('/')
    await expect(page.getByText('Via Roma 42, 28100 Novara, Italy').first()).toBeVisible()
    await expect(page.getByRole('link', { name: '+39 0321 123 456' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'info@casaaurelia.it' })).toBeVisible()
    await expect(page.getByText('12:00 – 14:00').first()).toBeVisible()
    await expect(page.getByText('19:00 – 22:00').first()).toBeVisible()
    await expect(page.getByText('Monday').first()).toBeVisible()
    await expect(page.getByText('Manage Reservation').first()).toBeVisible()

    for (const { name, url } of [
      { name: 'Instagram', url: 'https://www.instagram.com/casaaurelia' },
      { name: 'Facebook', url: 'https://www.facebook.com/casaaurelia' },
      { name: 'TripAdvisor', url: 'https://www.tripadvisor.com/casaaurelia' },
    ]) {
      const link = page.getByRole('link', { name, exact: true }).first()
      await expect(link).toHaveAttribute('href', url)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', /noopener/)
      await expect(link).toHaveAttribute('rel', /noreferrer/)
    }

    await expect(page.getByRole('link', { name: 'Staff Login' })).toHaveAttribute('href', '/admin')

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('deep links survive reload and browser back/forward navigation', async ({ page }) => {
    const errors = watchPageErrors(page)

    await page.goto('/menu')
    await expect(page.getByRole('heading', { level: 1, name: 'Written each morning.' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Written each morning.' })).toBeVisible()

    await page.goto('/contact')
    await expect(page.getByRole('heading', { level: 1, name: /A brass sign/ })).toBeVisible()

    await page.goto('/reservations')
    await expect(page.getByRole('heading', { level: 1, name: 'Reserve a Table' })).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(/\/contact$/)
    await expect(page.getByRole('heading', { level: 1, name: /A brass sign/ })).toBeVisible()

    await page.goForward()
    await expect(page).toHaveURL(/\/reservations$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Reserve a Table' })).toBeVisible()

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('a full public-site walk produces no failed requests and no console errors', async ({ page }) => {
    const errors = watchPageErrors(page)
    const failures = collectFailedRequests(page)

    for (const route of [
      '/',
      '/about',
      '/signatures',
      '/menu',
      '/gallery',
      '/contact',
      '/reservation-lookup',
    ]) {
      await page.goto(route)
      await expect(page.locator('#root')).toBeVisible()
    }

    await expect.poll(() => failures()).toEqual([])
    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })
})

test.describe('public site – reservations page sanity', () => {
  test('the bookings page reflects live restaurant hours and the weekly closed day', async ({ page }) => {
    const errors = watchPageErrors(page)

    await page.goto('/reservations')
    await expect(page.getByRole('heading', { level: 1, name: 'Reserve a Table' })).toBeVisible()

    // The dining room capacity note is driven by live restaurant data.
    await expect(page.getByText(/The dining room holds/)).toBeVisible()

    // The seeded weekly closed day (Monday) is not bookable.
    const mondayDate = new Date()
    mondayDate.setDate(new Date().getDate() + 21)
    while (mondayDate.getDay() !== 1) mondayDate.setDate(mondayDate.getDate() + 1)
    await page.locator('#date').fill(mondayDate.toISOString().slice(0, 10))
    await expect(page.getByText(/closed on Mondays/).first()).toBeVisible()

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })
})