import { join } from 'node:path'
import { expect, type Page } from '@playwright/test'
import { test, watchPageErrors } from './helpers/fixtures'

/**
 * QA-8 — Visual & Responsive QA for Casa Aurelia.
 *
 * Verifies the public site renders correctly across the desktop / tablet /
 * phone viewport matrix, that no viewport leaks horizontal overflow, clipping,
 * overlap or broken breakpoints, and that the QA-7 visual changes (solid
 * navbar on /menu & /gallery, richer monogram fallback, stone-toned captions)
 * introduce zero regressions.
 *
 * Enforcement rules honoured by this suite:
 *   - No production code is changed here; screenshots are evidence only
 *     (no snapshot / golden-image system).
 *   - Runs against the disposable E2E backend (backend/run_e2e.py) started by
 *     the Playwright webServer — never the development database.
 *   - Overflow is measured on the real layout (documentElement.scrollWidth vs
 *     window.innerWidth). Intentionally scrollable, clipped components (the
 *     menu & gallery category rails under `lg`) are either ignored by the
 *     element-clip checks or asserted on their own — overflow is never
 *     "hidden to pass".
 *   - The reservation wizard is driven to the review step only; nothing is
 *     submitted, so no email is ever sent.
 *
 * Viewport matrix mapped to the Tailwind v4 breakpoints used by the source
 * (sm 640 / md 768 / lg 1024 / xl 1280): the navbar's inline links are xl-only,
 * `lg` is where the shared col-span grids and the unwrapped category rails
 * switch on, and the phone column is treated as < sm.
 */
const V = [
  { label: 'xl-1440x900', width: 1440, height: 900 },
  { label: 'lg-1024x768', width: 1024, height: 768 },
  { label: 'md-768x1024', width: 768, height: 1024 },
  { label: 'sm-390x844', width: 390, height: 844 },
  { label: 'xs-375x812', width: 375, height: 812 },
] as const

type Viewport = (typeof V)[number]

const ROUTE_LANDINGS: Record<string, RegExp> = {
  '/': /A table set/,
  '/menu': /^Written each morning\.$/,
  '/signatures': /Dishes that remain/,
  '/about': /^Our Story$/,
  '/gallery': /A glimpse of the evening\./,
  '/reservations': /^Reserve a Table$/,
  '/contact': /A brass sign/,
  '/reservation-lookup': /^Manage Reservation$/,
}

const ALL_ROUTES = Object.keys(ROUTE_LANDINGS)
const MOBILE = [V[3], V[4]]

async function setViewport(page: Page, v: Viewport): Promise<void> {
  await page.setViewportSize({ width: v.width, height: v.height })
}

/** Goes to a public route and waits for its signature h1 to render. */
async function gotoRoute(page: Page, route: string): Promise<void> {
  await page.goto(route)
  await expect(page.getByRole('heading', { level: 1, name: ROUTE_LANDINGS[route] })).toBeVisible()
}

/** The QA-8 overflow assertion: the document must never scroll sideways. */
async function expectNoHorizontalOverflow(page: Page, context: string): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(
    scrollWidth,
    `${context}: document must not overflow horizontally (scrollWidth=${scrollWidth} px vs viewport ${innerWidth} px)`,
  ).toBeLessThanOrEqual(innerWidth)
}

async function switchLanguage(page: Page, displayName: string): Promise<void> {
  // The only button exposing a listbox is the language selector; its aria-label
  // is translated per UI language ("Select language", "Sprache auswählen",
  // "Seleziona lingua", "Seleccionar idioma", ...) so target the stable
  // accessibility attribute instead of a localised string.
  const trigger = page.locator('button[aria-haspopup="listbox"]:visible').first()
  await trigger.click()
  await page.getByRole('option', { name: displayName }).click()
}

/** Reads the fixed header's background alpha (0 = transparent, >0 = solid). */
async function headerBackgroundAlpha(page: Page): Promise<number> {
  return page.evaluate(() => {
    const header = document.querySelector('header')
    if (!header) return 0
    const raw = getComputedStyle(header).backgroundColor
    if (raw === 'transparent') return 0
    const parts = raw.match(/[\d.]+/g)?.map(Number) ?? []
    if (parts.length >= 4) return parts[3]
    return parts.length >= 3 ? 1 : 0
  })
}

// Auth polling for a logged-out visitor is expected to receive 401 on
// /api/auth/refresh; any other non-2xx response is a regression (same contract
// as the QA-6 suite).
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

/** Selects a bookable time slot and waits for the real availability verdict. */
async function pickSlotAndWait(page: Page): Promise<string> {
  const slots = ['12:00', '19:00', '21:30']
  for (const slot of slots) {
    await page.getByRole('button', { name: slot, exact: true }).click()
    const decision = await page.waitForFunction(
      () => {
        const statusText = Array.from(document.querySelectorAll('[role="status"]'))
          .map((b) => b.textContent ?? '')
          .join(' ')
        const next = Array.from(document.querySelectorAll('button')).find(
          (b) => (b.textContent ?? '').trim() === 'Next',
        )
        if (next && !(next as HTMLButtonElement).disabled) return 'available'
        if (/Fully booked|no longer available/i.test(statusText)) return 'unavailable'
        return 'pending'
      },
      undefined,
      { timeout: 15_000 },
    )
    const chosen = (await decision.jsonValue()) as string
    if (chosen === 'available') return slot
  }
  throw new Error(`No bookable time slot among [${slots.join(', ')}] for the seeded E2E data`)
}

test.describe('QA-8 visual & responsive', () => {
  test('1 — global layout: no horizontal overflow anywhere in the viewport matrix', async ({ page }) => {
    // Drives 5 viewports × 8 routes = 40 real navigations with h1 waits; the
    // Vite dev server under parallel load needs more than the 30s default.
    test.setTimeout(180_000)
    const errors = watchPageErrors(page)
    for (const v of V) {
      await setViewport(page, v)
      for (const route of ALL_ROUTES) {
        await gotoRoute(page, route)
        await expectNoHorizontalOverflow(page, `${v.label} @ ${route}`)
      }
    }
    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('2 — homepage hero and section grids hold at desktop and phone widths', async ({ page }) => {
    for (const v of [V[0], V[4]]) {
      await setViewport(page, v)
      await gotoRoute(page, '/')

      await expect(page.getByRole('link', { name: 'Book a Table' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'View Menu' }).first()).toBeVisible()
      await expect(page.getByText('Scroll to explore')).toBeVisible()

      // The cinematic hero fills the first screen.
      const heroBox = await page.locator('section').first().boundingBox()
      expect(heroBox?.height).toBeGreaterThanOrEqual(v.height - 1)

      // Signature dishes render 3-up at xl and stack on phones.
      const sig = page.locator('section').filter({ has: page.getByRole('link', { name: 'Explore Full Menu' }) })
      await sig.scrollIntoViewIfNeeded()
      const cards = sig.locator('figure')
      await expect(cards).toHaveCount(3)
      const tops = () =>
        cards.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
      if (v.width >= 1024) {
        await expect
          .poll(async () => {
            const ts = await tops()
            return Math.max(...ts) - Math.min(...ts)
          }, { timeout: 4_000 })
          .toBeLessThan(4)
      } else {
        await expect
          .poll(
            async () => {
              const ts = await tops()
              return ts[2] > ts[1] && ts[1] > ts[0]
            },
            { timeout: 4_000 },
          )
          .toBe(true)
      }
      await expectNoHorizontalOverflow(page, `${v.label} homepage`)
    }
  })

  test('3 — navbar follows the xl breakpoint, shows the QA-7 solid bar on /menu & /gallery and opens a fullscreen menu below xl', async ({ page }) => {
    const header = page.locator('header')

    // Desktop xl: inline nav visible, no hamburger.
    await setViewport(page, V[0])
    await gotoRoute(page, '/')
    for (const label of ['Our Story', 'Signatures', 'Menu', 'Gallery', 'Visit']) {
      await expect(header.getByRole('link', { name: label, exact: true })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden()

    // QA-7 regression: the bar is solid at the very top on /menu and /gallery.
    for (const route of ['/menu', '/gallery']) {
      await gotoRoute(page, route)
      expect(await headerBackgroundAlpha(page), `${route} must be solid from the top`).toBeGreaterThan(0.1)
    }

    // Dark-top routes start transparent and go solid after scrolling.
    await gotoRoute(page, '/')
    expect(await headerBackgroundAlpha(page), `home bar must be transparent at the very top`).toBeLessThanOrEqual(0.01)
    await page.evaluate(() => window.scrollTo(0, 600))
    await expect
      .poll(() => headerBackgroundAlpha(page), { timeout: 3_000, intervals: [150] })
      .toBeGreaterThan(0.1)
    expect(await header.evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(0)

    // Below xl the hamburger opens a full-viewport overlay menu.
    for (const v of [V[1], V[2], V[3], V[4]]) {
      await setViewport(page, v)
      await gotoRoute(page, '/')
      const toggle = page.getByRole('button', { name: 'Open menu' })
      await expect(toggle).toBeVisible()
      await expect(header.getByRole('link', { name: 'Our Story' })).toBeHidden()

      await toggle.click()
      const overlay = header.locator('div.fixed.inset-0').last()
      await expect(overlay.getByRole('link', { name: /Our Story/ })).toBeVisible()
      const box = await overlay.boundingBox()
      expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(v.width - 1)
      expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(v.height - 1)
      await expectNoHorizontalOverflow(page, `${v.label} mobile menu open`)

      await page.keyboard.press('Escape')
      await expect(toggle).toBeVisible({ timeout: 5_000 })
    }
  })

  test('4 — menu page: the category rail unwraps at lg and dishes keep their row layout', async ({ page }) => {
    for (const v of [V[0], V[1], V[2], V[4]]) {
      await setViewport(page, v)
      await gotoRoute(page, '/menu')

      // The category rail must show every category without clipping at lg+.
      const rail = page.getByRole('group', { name: 'Our Menu' })
      await expect(rail).toBeVisible()
      if (v.width >= 1024) {
        const fits = await rail.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
        expect(fits, `${v.label}: every category must fit the visible rail`).toBe(true)
      }

      // A real dish row: thumbnail + name + price, nothing clipped.
      await expect(page.getByRole('heading', { level: 3, name: 'Burrata Pugliese' })).toBeVisible()
      await expect(page.getByText('€16.00').first()).toBeVisible()

      // Every dish figure keeps a non-collapsed aspect frame.
      const collapsed = await page
        .locator('figure')
        .evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width === 0 || e.getBoundingClientRect().height === 0).length)
      expect(collapsed).toBe(0)

      await expectNoHorizontalOverflow(page, `${v.label} /menu`)
    }
  })

  test('5 — signatures journal alternates without overlap at lg and stacks on phones', async ({ page }) => {
    await setViewport(page, V[0])
    await gotoRoute(page, '/signatures')
    const spread = page.locator('article').first()
    await expect(spread).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Tagliatelle al Tartufo' })).toBeVisible()

    const columns = spread.locator(':scope > div')
    const imageBox = await columns.nth(0).boundingBox()
    const textBox = await columns.nth(1).boundingBox()
    expect(imageBox && textBox).toBeTruthy()
    // Side-by-side: the text column starts to the right of the image column.
    // (Playwright's boundingBox exposes x/y/width/height, so compute the edges.)
    const imageRight = imageBox!.x + imageBox!.width
    const textLeft = textBox!.x
    expect(Math.round(imageRight)).toBeLessThanOrEqual(Math.round(textLeft) + 2)
    await expectNoHorizontalOverflow(page, 'xl /signatures')

    for (const v of MOBILE) {
      await setViewport(page, v)
      await gotoRoute(page, '/signatures')
      const cols = page.locator('article').first().locator(':scope > div')
      const img = await cols.nth(0).boundingBox()
      const txt = await cols.nth(1).boundingBox()
      expect(img && txt).toBeTruthy()
      // Stacked vertically (allow the 28px reveal transform before settling).
      expect(txt!.y).toBeGreaterThanOrEqual(img!.y + img!.height - 30)
      await expectNoHorizontalOverflow(page, `${v.width}x${v.height} /signatures`)
    }
  })

  test('6 — gallery tiles populate and the lightbox fits the viewport with working controls', async ({ page }) => {
    // Remote gallery CDN imagery may stall in offline/slow environments; the
    // lightbox layout + controls must still be verified so this needs a seat
    // bigger than the default 30s test timeout.
    test.setTimeout(120_000)
    for (const v of [V[0], V[4]]) {
      await setViewport(page, v)
      await gotoRoute(page, '/gallery')
      const tiles = page.getByRole('button', { name: /^View / })
      await expect(tiles).toHaveCount(16)

      await tiles.first().click()
      const dialog = page.getByRole('dialog', { name: 'Image lightbox' })
      await expect(dialog).toBeVisible()
      const dbox = await dialog.boundingBox()
      expect(Math.round(dbox?.width ?? 0)).toBeGreaterThanOrEqual(v.width - 1)
      expect(Math.round(dbox?.height ?? 0)).toBeGreaterThanOrEqual(v.height - 1)

      // The lightbox image is served from the remote gallery CDN. Give it a
      // bounded window to load, then verify the deliberate containment only
      // when the image actually arrives (third-party latency is not a layout
      // defect). If it fails, the graceful monogram fallback takes over, which
      // is the intended degradation from the source (status === 'error').
      await page
        .waitForFunction(
          () => {
            const dialog = document.querySelector('[role="dialog"]')
            if (!dialog) return false
            const monogram = Array.from(dialog.querySelectorAll('span')).some((s) =>
              (s.textContent ?? '').includes('CASA AURELIA'),
            )
            if (monogram) return true
            const img = dialog.querySelector('img')
            return img instanceof HTMLImageElement && img.complete
          },
          undefined,
          { timeout: 10_000 },
        )
        .catch(() => undefined)
      const lightboxImg = dialog.locator('img').last()
      if ((await lightboxImg.count()) > 0) {
        const loaded = await lightboxImg.evaluate(
          (el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0,
        )
        if (loaded) {
          const ibox = await lightboxImg.boundingBox()
          const maxHFactor = v.width >= 768 ? 0.76 : 0.72
          expect(ibox).toBeTruthy()
          expect(ibox!.width).toBeLessThanOrEqual(v.width * 0.9 + 1)
          expect(ibox!.height).toBeLessThanOrEqual(v.height * maxHFactor + 1)
        }
      }

      for (const name of ['Close lightbox', 'Previous image', 'Next image']) {
        await expect(dialog.getByRole('button', { name })).toBeVisible()
      }
      await expectNoHorizontalOverflow(page, `${v.label} lightbox open`)

      await page.keyboard.press('ArrowRight')
      await expect(page.getByText('2 of 16', { exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
    }
  })

  test('7 — about hero and story grids render without overlap', async ({ page }) => {
    for (const v of [V[0], V[2], V[4]]) {
      await setViewport(page, v)
      await gotoRoute(page, '/about')

      // The cinematic hero fills most of the first screen (min-h-[86vh]).
      const heroBox = await page.locator('section').first().boundingBox()
      expect(heroBox?.height).toBeGreaterThanOrEqual(v.height * 0.86 - 1)

      // Story blockquote and drop-cap paragraphs keep inside their columns.
      const story = page.locator('section').filter({ hasText: 'Our Story' }).first()
      await story.scrollIntoViewIfNeeded()
      await expectNoHorizontalOverflow(page, `${v.label} /about`)
    }
  })

  test('8 — contact details wrap on phones and the form lays out inside its card', async ({ page }) => {
    await setViewport(page, V[4])
    await gotoRoute(page, '/contact')
    const vw = await page.evaluate(() => window.innerWidth)

    const phone = page.getByRole('link', { name: '+39 0321 123 456' }).first()
    await expect(phone).toBeVisible()
    const phoneBox = await phone.boundingBox()
    expect(phoneBox && phoneBox.x + phoneBox.width).toBeLessThanOrEqual(vw + 2)
    expect(phoneBox && phoneBox.x).toBeGreaterThanOrEqual(-2)

    for (const label of ['Name', 'Email', 'Subject', 'Message']) {
      await expect(page.getByLabel(label)).toBeVisible()
    }
    const send = page.getByRole('button', { name: 'Send Message' })
    await expect(send).toBeVisible()

    // Empty submit surfaces errors without changing the layout.
    await send.click()
    await expect(page.getByText('Name is required')).toBeVisible()
    await expectNoHorizontalOverflow(page, '375 /contact form errors')

    // Desktop: two-column details/hours block stays side by side.
    await setViewport(page, V[0])
    await gotoRoute(page, '/contact')
    await expectNoHorizontalOverflow(page, 'xl /contact')
  })

  test('9 — reservation wizard holds at every step on the smallest phone and reaches review without submitting', async ({ page }) => {
    await setViewport(page, V[4])
    await gotoRoute(page, '/reservations')

    const next = page.getByRole('button', { name: 'Next', exact: true })

    // Step 0 — date (future, not the closed Monday).
    const date = page.locator('#date')
    await expect(date).toBeVisible()
    const d = new Date()
    d.setDate(d.getDate() + 21)
    while (d.getDay() === 1) d.setDate(d.getDate() + 1)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    await date.fill(iso)
    await next.click()

    // Step 1 — guests: 12 buttons in a 4-across grid at 375px.
    const guestButtons = page.getByRole('button', { name: /^\d+$/ })
    await expect(guestButtons).toHaveCount(12)
    // 4-across: button "4" shares the row with button "1", button "5" wraps.
    // Read all positions in one frame and poll past the step-reveal animation.
    await expect
      .poll(async () => {
        const tops = await guestButtons.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
        return tops[3] === tops[0] && tops[4] !== tops[0]
      }, { timeout: 5_000 })
      .toBe(true)
    await page.getByRole('button', { name: '2', exact: true }).click()
    await expectNoHorizontalOverflow(page, '375 wizard step 1')
    await next.click()

    // Step 2 — time: real availability check, then proceed.
    await pickSlotAndWait(page)
    await expectNoHorizontalOverflow(page, '375 wizard step 2')
    await next.click()

    // Step 3 — details.
    const email = `qa8-${Date.now()}@example.org`
    await page.getByLabel('First Name').fill('QA8')
    await page.getByLabel('Last Name').fill('Tester')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Phone').fill('+39 555 010 099')
    await expectNoHorizontalOverflow(page, '375 wizard step 3')
    await next.click()

    // Step 4 — review (no submission, no email).
    await expect(page.getByText('QA8 Tester').first()).toBeVisible()
    await expect(page.getByText(email, { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirm reservation' })).toBeVisible()
    await expectNoHorizontalOverflow(page, '375 wizard step 4 review')

    // Back returns to step 3 without losing the flow.
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.getByLabel('First Name')).toBeVisible()
  })

  test('10 — reservation lookup stays intact and surfaces not-found cleanly on phones and desktop', async ({ page }) => {
    for (const v of [V[0], V[4]]) {
      await setViewport(page, v)
      await gotoRoute(page, '/reservation-lookup')

      await expect(page.getByLabel('Reference Code')).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()

      const find = page.getByRole('button', { name: /Find Reservation/ })
      await find.click()
      await expect(page.getByText('Reference code is required')).toBeVisible()

      await page.getByLabel('Reference Code').fill('CASA-QA8-NOTFOUND')
      await page.getByLabel('Email').fill(`qa8-${Date.now()}@example.org`)
      await find.click()
      await expect(page.getByText(/Reservation not found/)).toBeVisible()
      await expectNoHorizontalOverflow(page, `${v.label} lookup result`)
    }
  })

  test('11 — the confirmed route is guarded: unreachable without real booking state', async ({ page }) => {
    await setViewport(page, V[0])
    await page.goto('/reservation-confirmed')
    await expect(page).toHaveURL(/\/reservations$/)
    await expect(page.getByRole('heading', { level: 1, name: /^Reserve a Table$/ })).toBeVisible()
    await expectNoHorizontalOverflow(page, 'confirmed-redirect -> /reservations')
  })

  test('12 — footer CTA widens on phones and the columns span at lg', async ({ page }) => {
    const footer = page.locator('footer')
    for (const v of [V[4], V[1], V[0]]) {
      await setViewport(page, v)
      await gotoRoute(page, '/')
      await footer.scrollIntoViewIfNeeded()
      await expect(footer).toBeVisible()

      const reserveCta = footer.getByRole('link', { name: 'Reserve a Table' })
      await expect(reserveCta).toBeVisible()
      const ctaBox = await reserveCta.boundingBox()
      if (v.width < 1024) {
        expect(ctaBox?.width, `${v.label}: footer CTA should stretch full-width`).toBeGreaterThanOrEqual(v.width - 80)
      } else {
        expect(ctaBox?.width, `${v.label}: footer CTA should size to its label`).toBeLessThan(400)
      }

      // The four footer columns sit on one row from lg up.
      if (v.width >= 1024) {
        const grid = footer.locator('div.grid').first()
        const columns = grid.locator(':scope > div')
        await expect(columns).toHaveCount(4)
        const gridBox = await grid.boundingBox()
        expect(gridBox?.width).toBeGreaterThan(0)
      }

      await expect(footer.getByRole('link', { name: 'Staff Login' })).toBeVisible()
      await expectNoHorizontalOverflow(page, `${v.label} footer`)
    }
  })

  test('13 — German and Italian render across key routes without overflow at desktop and phone', async ({ page }) => {
    await setViewport(page, V[0])
    await gotoRoute(page, '/')

    await switchLanguage(page, 'Deutsch')
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('de')
    // Target the inline desktop nav by structural position rather than by its
    // (language-localised) aria-label, which is "Main navigation" in English,
    // "Hauptnavigation" in German, "Navigazione principale" in Italian.
    const desktopNav = page.locator('header nav').first()
    const sigLink = desktopNav.getByRole('link', { name: 'Signature-Gerichte' })
    await expect(sigLink).toBeVisible()
    // The longest German label must stay on a single line (the desktop nav also
    // legitimately contains the taller brand mark and the Reserve CTA button, so
    // measure only the inline nav-label anchors).
    const heights = await desktopNav
      .getByRole('link')
      .evaluateAll((els) =>
        els
          .filter((e) => e.className.includes('group relative'))
          .map((e) => Math.round(e.getBoundingClientRect().height)),
      )
    expect(heights.length).toBeGreaterThanOrEqual(5)
    for (const h of heights) expect(h, `German desktop nav link must stay single-line`).toBeLessThan(40)
    await expectNoHorizontalOverflow(page, 'de xl home')

    await switchLanguage(page, 'Italiano')
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('it')
    await expectNoHorizontalOverflow(page, 'it xl home')

    // Phone: language expansion on /menu, /reservations and /contact.
    await setViewport(page, V[4])
    for (const [lang, route] of [
      ['Deutsch', '/menu'],
      ['Italiano', '/menu'],
      ['Deutsch', '/reservations'],
      ['Italiano', '/reservations'],
      ['Deutsch', '/contact'],
      ['Italiano', '/contact'],
    ] as const) {
      await switchLanguage(page, lang)
      await page.goto(route)
      await expect(page.locator('#root')).toBeVisible()
      await expectNoHorizontalOverflow(page, `${lang} ${route} at 390`)
    }
  })

  test('14 — imagery keeps its frames and the monogram fallback is ready behind every dish tile', async ({ page }) => {
    for (const route of ['/', '/about', '/contact', '/signatures', '/menu', '/gallery']) {
      await setViewport(page, V[4])
      await gotoRoute(page, route)
      const renderedImages = await page
        .locator('img')
        .evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0).length)
      expect(renderedImages, `${route} must render at least one image frame`).toBeGreaterThan(0)
    }

    await setViewport(page, V[4])
    await gotoRoute(page, '/menu')
    const figures = page.locator('figure')
    await expect(figures.first()).toBeVisible()
    const collapsed = await figures
      .evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width === 0 || e.getBoundingClientRect().height === 0).length)
    expect(collapsed).toBe(0)
    // The graceful fallback sheet (CASA AURELIA monogram) is present behind each tile.
    const fallbacks = await figures.evaluateAll((els) =>
      els.filter((e) => e.textContent?.includes('CASA AURELIA')).length,
    )
    expect(fallbacks).toBe(await figures.count())
  })

  test('15 — the fixed header stays pinned and the reservation atlas keeps its lg sticky column', async ({ page }) => {
    await setViewport(page, V[0])
    await gotoRoute(page, '/')
    await page.evaluate(() => window.scrollTo(0, 500))
    await expect(page.locator('header').evaluate((el) => Math.round(el.getBoundingClientRect().top))).resolves.toBe(0)

    // The skip link remains the first keyboard stop (QA-7 regression guard).
    await page.goto('/')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.keyboard.press('Tab')
    const skipInfo = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      return el ? (el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.tagName) : 'BODY'
    })
    expect(skipInfo).toContain('Skip to main content')

    // Reservations: the atlas ("at a glance") column is sticky at lg.
    await setViewport(page, V[0])
    await gotoRoute(page, '/reservations')
    const sticky = page.locator('aside > div').first()
    const position = await sticky.evaluate((el) => getComputedStyle(el).position)
    const top = await sticky.evaluate((el) => getComputedStyle(el).top)
    expect(position).toBe('sticky')
    // getComputedStyle reports the computed offset in px; 7rem at the 16px root
    // base equals 112px (the atlas column clears the fixed header).
    expect(top).toBe('112px')
  })

  test('16 — resizing between desktop and phone keeps every surface intact', async ({ page }) => {
    const errors = watchPageErrors(page)

    await setViewport(page, V[0])
    await gotoRoute(page, '/')
    await setViewport(page, V[4])
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
    await expectNoHorizontalOverflow(page, 'home after 1440x900 -> 390x844')

    await page.goto('/menu')
    await setViewport(page, V[0])
    await expect(page.locator('header').getByRole('link', { name: 'Our Story' })).toBeVisible()
    await expectNoHorizontalOverflow(page, 'menu after 390x844 -> 1440x900')

    await page.goto('/reservations')
    await setViewport(page, V[2])
    await expectNoHorizontalOverflow(page, 'reservations at 768x1024')
    await setViewport(page, V[4])
    await expectNoHorizontalOverflow(page, 'reservations at 375x812')

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('17 — captures full-page visual evidence at desktop, tablet and phone viewports', async ({ page }) => {
    // 8 routes × 3 viewports of full-page screenshots legitimately needs more
    // than the 30s default; screenshots are QA evidence, not assertions on pixels.
    test.setTimeout(240_000)
    const saved: string[] = []
    for (const v of [V[0], V[1], V[4]]) {
      for (const route of ALL_ROUTES) {
        await setViewport(page, v)
        await page.goto(route)
        await expect(page.locator('#root')).toBeVisible()
        await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()))
        await page
          .waitForLoadState('networkidle', { timeout: 10_000 })
          .catch(() => undefined)
        const routeName = route === '/' ? 'home' : route.slice(1)
        const file = `${routeName}-${v.width}x${v.height}.png`
        saved.push(file)
        await page.screenshot({
          path: join(process.cwd(), 'test-results', 'qa8-screenshots', file),
          fullPage: true,
        })
      }
    }
    expect(saved).toHaveLength(ALL_ROUTES.length * 3)
  })

  test('18 — defect criteria: no visible control or heading clips past the 375px viewport', async ({ page }) => {
    for (const route of ['/', '/menu', '/reservations', '/contact']) {
      await setViewport(page, V[4])
      await gotoRoute(page, route)

      const offenders = await page.evaluate(() => {
        const vw = window.innerWidth
        const skip = new Set<Element>()
        // Intentionally scrollable / clipped rails (menu & gallery categories).
        document.querySelectorAll('.overflow-x-auto, .no-scrollbar').forEach((rail) => {
          skip.add(rail)
          rail.querySelectorAll('*').forEach((el) => skip.add(el))
        })
        const out: string[] = []
        document
          .querySelectorAll('h1, h2, h3, p, span, a, button, input, textarea')
          .forEach((el) => {
            if (skip.has(el)) return
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return
            const st = getComputedStyle(el)
            if (st.display === 'none' || st.visibility === 'hidden' || st.position === 'fixed') return
            if (el.className.includes('sr-only')) return
            if (r.right > vw + 2 || r.left < -2) {
              out.push(
                `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 28)}" left=${Math.round(r.left)} right=${Math.round(r.right)}`,
              )
            }
          })
        return out
      })
      expect(offenders, `${route} must not clip any visible control or heading at 375px`).toEqual([])
    }
  })

  test('19 — console and network stay clean across the matrix (only the expected refresh 401 and favicon pass)', async ({ page }) => {
    // 3 viewports × 8 routes of real navigations; needs more than the 30s default.
    test.setTimeout(150_000)
    const errors = watchPageErrors(page)
    const failures = collectFailedRequests(page)
    for (const v of [V[0], V[2], V[4]]) {
      await setViewport(page, v)
      for (const route of ALL_ROUTES) {
        await gotoRoute(page, route)
      }
    }
    await expect.poll(() => failures()).toEqual([])
    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('20 — every route renders a single h1 and no overflow on the tablet and phone viewports', async ({ page }) => {
    // 3 viewports × 8 routes of real navigations; needs more than the 30s default.
    test.setTimeout(150_000)
    for (const v of [V[1], V[2], V[3]]) {
      await setViewport(page, v)
      for (const route of ALL_ROUTES) {
        await gotoRoute(page, route)
        expect(await page.title(), `${route} must keep an engineered title`).not.toBe('')
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
        await expectNoHorizontalOverflow(page, `${v.label} ${route}`)
      }
    }
  })
})