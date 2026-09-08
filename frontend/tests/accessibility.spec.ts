import type { Page, Locator } from '@playwright/test'
import { test, expect, watchPageErrors } from './helpers/fixtures'
import AxeBuilder from '@axe-core/playwright'

// All customer-facing routes rendered inside MainLayout (each has a nav,
// footer and a single <main> once the landmark fix is in place).
const PUBLIC_ROUTES = [
  '/',
  '/menu',
  '/signatures',
  '/about',
  '/gallery',
  '/reservations',
  '/contact',
  '/reservation-lookup',
] as const

async function activeElementInfo(page: Page): Promise<{ tag: string; name: string; id: string }> {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return { tag: 'BODY', name: '', id: '' }
    const target = el as HTMLElement
    return {
      tag: target.tagName,
      name: (target.getAttribute('aria-label') ?? target.textContent?.trim() ?? '').slice(0, 80),
      id: target.id,
    }
  })
}

// True when focusing the element changes any part of the focus indicator
// (outline, ring box-shadow or the input-field focus border).
async function hasFocusVisualChange(locator: Locator): Promise<boolean> {
  const snapshot = () =>
    locator.evaluate((el) => {
      const s = getComputedStyle(el)
      return [s.outlineStyle, s.outlineWidth, s.boxShadow, s.borderBottomColor].join('|')
    })
  const before = await snapshot()
  await locator.evaluate((el) => (el as HTMLElement).focus())
  const after = await snapshot()
  return before !== after
}

test.describe('accessibility — public pages', () => {
  test('1 — every public page exposes exactly one meaningful main, one contentinfo and a labelled navigation', async ({ page }) => {
    for (const route of PUBLIC_ROUTES) {
      await page.goto(route)
      await expect(page.getByRole('main')).toHaveCount(1)
      await expect(page.getByRole('contentinfo')).toHaveCount(1)
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(1)

      const main = page.getByRole('main')
      await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1)
      expect(await page.title()).not.toBe('')

      // Heading order inside main must not skip levels when descending.
      const levels = await main
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((els) => els.map((el) => Number(el.tagName.slice(1))))
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] > levels[i - 1]) {
          expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
        }
      }

      const errors = watchPageErrors(page)
      await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
    }
  })

  test('2 — keyboard users can bypass the header, tab without traps and activate every control with Enter/Space', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('main')).toHaveCount(1)

    // Skip link is the first focusable element and moves focus into <main>.
    await page.keyboard.press('Tab')
    let info = await activeElementInfo(page)
    expect(info.name).toContain('Skip to main content')
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()

    // A bounded tab walk across the whole page must only ever land on real
    // interactive controls (BODY marks the natural end of the document's tab
    // sequence), keep moving (no trap) and never land inside an aria-hidden
    // subtree.
    let previous = ''
    for (let i = 0; i < 32; i++) {
      await page.keyboard.press('Tab')
      info = await activeElementInfo(page)
      if (info.tag === 'BODY') break
      expect(info.tag, `tab stop ${i} must be a real control, got ${JSON.stringify(info)}`).toMatch(new RegExp('^(A|BUTTON|INPUT|TEXTAREA|SELECT)$'))
      const insideHidden = await page.evaluate(() => {
        const el = document.activeElement
        return el ? el.closest('[aria-hidden="true"]') !== null : false
      })
      expect(insideHidden).toBe(false)
      const identity = `${info.tag}#${info.id}#${info.name}`
      expect(identity).not.toBe(previous)
      previous = identity
    }
    expect(previous).toBeTruthy()

    // Keyboard activation: Enter on a nav link navigates.
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Our Story' }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/about$/)

    // Keyboard activation: the language selector opens with Enter and Escape
    // closes it and restores focus to the trigger.
    const trigger = page.getByRole('button', { name: 'Select language' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('listbox', { name: 'Available languages' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox', { name: 'Available languages' })).toHaveCount(0)
    info = await activeElementInfo(page)
    expect(info.name).toBe('Select language')

    const errors = watchPageErrors(page)
    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('3 — focused controls always expose a visible focus indicator', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('main')).toHaveCount(1)

    const skipLink = page.getByRole('link', { name: 'Skip to main content' })
    const navLink = page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Our Story' })
    const language = page.getByRole('button', { name: 'Select language' })
    const reserveLink = page.getByRole('link', { name: 'Reserve a Table' }).first()

    for (const locator of [skipLink, navLink, language, reserveLink]) {
      const label = await locator.evaluate((el) => el.textContent)
      expect(await hasFocusVisualChange(locator), `${label} must show visible focus`).toBe(true)
    }

    await page.goto('/reservations')
    await expect(page.getByRole('main')).toHaveCount(1)
    const dateInput = page.getByLabel('Date')
    await expect(dateInput).toBeVisible()
    expect(await hasFocusVisualChange(dateInput)).toBe(true)

    await page.goto('/menu')
    await expect(page.getByRole('main')).toHaveCount(1)
    const firstTab = page.getByRole('group', { name: 'Our Menu' }).getByRole('button').first()
    await expect(firstTab).toBeVisible()
    expect(await hasFocusVisualChange(firstTab)).toBe(true)

    await page.goto('/contact')
    await expect(page.getByRole('main')).toHaveCount(1)
    const sendButton = page.getByRole('button', { name: 'Send Message' })
    await expect(sendButton).toBeVisible()
    expect(await hasFocusVisualChange(sendButton)).toBe(true)
  })

  test('5 — gallery tiles open a keyboard-operable, focus-trapped lightbox that restores focus', async ({ page }) => {
    await page.goto('/gallery')
    await expect(page.getByRole('main')).toHaveCount(1)

    const tiles = page.getByRole('button', { name: /^View / })
    await expect(tiles.first()).toBeVisible()
    const tileCount = await tiles.count()

    // Open with the keyboard from a focused tile.
    await tiles.first().focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Image lightbox' })
    await expect(dialog).toBeVisible()

    // Focus moves into the dialog on open.
    const info = await activeElementInfo(page)
    expect(info.name).toBe('Close lightbox')

    // Counter reveals the current image (1 of N); Next/Previous + arrows work.
    const counter = dialog.getByText(/^\d+ of \d+$/)
    await expect(counter).toBeVisible()
    const firstCounter = await counter.textContent()
    expect(firstCounter).toMatch(/^1 of \d+$/)

    await dialog.getByRole('button', { name: 'Next image' }).click()
    await expect(dialog).toContainText('2 of')
    await page.keyboard.press('ArrowRight')
    await expect(dialog).toContainText('3 of')
    await page.keyboard.press('ArrowLeft')
    await expect(dialog).toContainText('2 of')

    // Tab never escapes the dialog (trap across close/prev/next).
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      const focused = await activeElementInfo(page)
      expect(['Close lightbox', 'Previous image', 'Next image']).toContain(focused.name)
    }
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Shift+Tab')
    const wrapped = await activeElementInfo(page)
    expect(['Close lightbox', 'Previous image', 'Next image']).toContain(wrapped.name)

    // Escape closes and focus returns to the opening tile.
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect.poll(async () => (await activeElementInfo(page)).name, { timeout: 3_000 }).toMatch(/^View /)
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')

    expect(tileCount).toBeGreaterThan(0)

    const errors = watchPageErrors(page)
    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('6 — form controls are labelled, errors are announced and associated, and submit states are understood', async ({ page }) => {
    const errors = watchPageErrors(page)

    // --- Contact form: association + required semantics + loading state.
    await page.goto('/contact')
    await expect(page.getByRole('main')).toHaveCount(1)

    const nameInput = page.getByLabel('Name')
    const emailInput = page.getByLabel('Email')
    const subjectInput = page.getByLabel('Subject')
    const messageInput = page.getByLabel('Message')
    for (const input of [nameInput, emailInput, subjectInput, messageInput]) {
      await expect(input).toBeVisible()
      await expect(input).toHaveAttribute('required', '')
    }

    await page.getByRole('button', { name: 'Send Message' }).click()
    for (const [input, errorId] of [
      [nameInput, 'name-error'],
      [emailInput, 'email-error'],
      [subjectInput, 'subject-error'],
      [messageInput, 'message-error'],
    ] as const) {
      await expect(input).toHaveAttribute('aria-invalid', 'true')
      await expect(input).toHaveAttribute('aria-describedby', errorId)
      await expect(page.locator(`#${errorId}`)).toHaveRole('alert')
      await expect(page.locator(`#${errorId}`)).not.toBeEmpty()
    }

    await emailInput.fill('not-an-email')
    await page.getByRole('button', { name: 'Send Message' }).click()
    await expect(page.getByText(/valid email/i)).toBeVisible()
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')

    // Delay the backend round-trip so the disabled "Sending..." state is observable.
    let received = false
    await page.route('**/api/contact', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
      received = true
    })
    await nameInput.fill('Alex Restaurant')
    await emailInput.fill('alex@example.com')
    await subjectInput.fill('Table for four')
    await messageInput.fill('We would love a table by the window.')
    await page.getByRole('button', { name: 'Send Message' }).click()
    await expect(page.getByRole('button', { name: /Sending/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Sending/i })).toBeDisabled()
    await expect(page.getByRole('status').filter({ hasText: /Thank you/i })).toBeVisible()
    expect(received).toBe(true)

    // --- Reservation wizard: every step validates and still keeps focus on the controls.
    await page.goto('/reservations')
    await expect(page.getByRole('main')).toHaveCount(1)
    const dateInput = page.getByLabel('Date')
    await expect(dateInput).toHaveAttribute('required', '')

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText(/date is required/i)).toBeVisible()
    await expect(page.locator('#date-error')).toHaveRole('alert')
    await expect(dateInput).toHaveAttribute('aria-describedby', 'date-error')

    // Pick a future date that is not the restaurant's closed day (deterministic).
    const futureDate = await page.evaluate(() => {
      for (let i = 1; i <= 12; i++) {
        const candidate = new Date(Date.now() + i * 86400000)
        const key = candidate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        if (key !== 'monday') return candidate.toISOString().slice(0, 10)
      }
      return null
    })
    await dateInput.fill(futureDate ?? '')
    await page.getByRole('button', { name: 'Next' }).click()

    // Guest selection is a group of pressed buttons.
    const twelveGuests = page.getByRole('button', { name: '12', exact: true })
    await twelveGuests.click()
    await expect(twelveGuests).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Next' }).click()

    // Time step: no selection yields an associated, announced error.
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText(/time is required/i)).toBeVisible()
    await expect(page.locator('#time-error')).toHaveRole('alert')
    await page.getByRole('button', { name: '19:00', exact: true }).click()
    await expect(page.getByRole('button', { name: '19:00', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Next' }).click()

    // Details step: shared required + invalid-state semantics per field.
    const firstNameInput = page.getByLabel('First name')
    const lastNameInput = page.getByLabel('Last name')
    const phoneInput = page.getByLabel('Phone')
    await page.getByRole('button', { name: 'Next' }).click()
    for (const input of [firstNameInput, lastNameInput, emailInput, phoneInput]) {
      await expect(input).toHaveAttribute('aria-invalid', 'true')
    }
    await expect(page.locator('#first_name-error')).toHaveRole('alert')
    await expect(firstNameInput).toHaveAttribute('aria-describedby', 'first_name-error')
    await expect(phoneInput).toHaveAttribute('required', '')

    // Wizard stays local (the shared E2E database is never written here, keeping
    // the parallel full suite deterministic); Back returns to the time step.
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(lastNameInput).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'Choose a time' })).toBeVisible()

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('7 — actions are buttons, navigation is links, and no clickable decoration pretends to be interactive', async ({ page }) => {
    for (const route of ['/', '/menu', '/gallery', '/contact']) {
      await page.goto(route)
      await expect(page.getByRole('main')).toHaveCount(1)

      // Header navigation must be real links.
      for (const name of ['Home', 'Our Story', 'Menu', 'Gallery', 'Reservations', 'Contact']) {
        const link = page.getByRole('link', { name })
        if ((await link.count()) > 0) {
          expect(await link.first().evaluate((el) => el.tagName)).toBe('A')
        }
      }

      // Nothing styled as clickable should lack a real control role.
      const nonSemanticClickable = await page
        .locator('[class*="cursor-pointer"]:not(a):not(button):not(input):not(textarea):not(select):not([role])')
        .count()
      expect(nonSemanticClickable, `route ${route} has non-semantic clickable elements`).toBe(0)
    }

    await page.goto('/gallery')
    const tile = page.getByRole('button', { name: /^View / }).first()
    expect(await tile.evaluate((el) => el.tagName)).toBe('BUTTON')
    await page.goto('/menu')
    const tab = page.getByRole('group', { name: 'Our Menu' }).getByRole('button').first()
    await expect(tab).toBeVisible()
    expect(await tab.evaluate((el) => el.tagName)).toBe('BUTTON')
  })

  test('8 — every image has an explicit alternative or is clearly decorative', async ({ page }) => {
    for (const route of ['/', '/menu', '/signatures', '/about', '/gallery', '/contact']) {
      await page.goto(route)
      await expect(page.getByRole('main')).toHaveCount(1)

      const missingAlt = await page.locator('main img:not([alt])').count()
      expect(missingAlt, `route ${route} has <img> elements without alt`).toBe(0)

      // Empty alt text is the standard, clearly-decorative mechanism (removes
      // the image from the accessibility tree), so any alt that is non-empty
      // must be a real description and never a raw URL or filename.
      const urlAsAlt = await page
        .locator('main img[alt]')
        .evaluateAll((imgs) =>
          imgs.filter((img) => {
            const alt = (img.getAttribute('alt') ?? '').trim()
            return alt !== '' && /(?:^https?:\/\/|\.(?:jpe?g|png|webp|gif|avif)$)/i.test(alt)
          }),
        )
      expect(urlAsAlt, `route ${route} exposes URLs as image alt text`).toHaveLength(0)
    }
  })

  test('9 — the interface can be switched to another language and back, fully re-labelling chrome and content', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('button', { name: 'Select language' })).toBeVisible()

    await page.getByRole('button', { name: 'Select language' }).click()
    await expect(page.getByRole('option', { name: 'Deutsch' })).toBeVisible()
    await page.getByRole('option', { name: 'Deutsch' }).click()

    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(page.getByRole('button', { name: 'Sprache auswählen' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible()
    const deNav = page.getByRole('navigation', { name: 'Hauptnavigation' })
    await expect(deNav.getByRole('link', { name: 'Unsere Geschichte' })).toBeVisible()
    await expect(deNav.getByRole('link', { name: 'Signature-Gerichte' })).toBeVisible()
    await expect(deNav.getByRole('link', { name: 'Speisekarte' })).toBeVisible()
    await expect(deNav.getByRole('link', { name: 'Besuch' })).toBeVisible()
    await expect(deNav.getByRole('link', { name: 'Tisch Reservieren' })).toBeVisible()
    expect(await page.title()).not.toBe('')

    // Switch back to English.
    await page.getByRole('button', { name: 'Sprache auswählen' }).click()
    await expect(page.getByRole('option', { name: 'English' })).toBeVisible()
    await page.getByRole('option', { name: 'English' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('button', { name: 'Select language' })).toBeVisible()
  })

  test('10 — selection and state are never communicated by colour alone', async ({ page }) => {
    await page.goto('/menu')
    await expect(page.getByRole('main')).toHaveCount(1)
    const tabs = page.getByRole('group', { name: 'Our Menu' }).getByRole('button')
    const allTab = tabs.filter({ hasText: 'All' })
    await expect(allTab).toHaveAttribute('aria-pressed', 'true')
    const inactivePressed = await tabs
      .filter({ hasNotText: 'All' })
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-pressed')))
    expect(inactivePressed.every((v) => v === 'false')).toBe(true)

    await page.goto('/reservations')
    await expect(page.getByRole('main')).toHaveCount(1)
    const dateInput = page.getByLabel('Date')
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(dateInput).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#date-error')).toHaveText(/date is required/i)
  })

  test('11 — automated audit reports no critical or serious violations', async ({ page }) => {
    test.setTimeout(300_000)
    const found: Array<{ route: string; id: string; impact: string; targets: string[] }> = []
    for (const route of PUBLIC_ROUTES) {
      await page.goto(route)
      await expect(page.getByRole('main')).toHaveCount(1)
      // Wait for the above-the-fold photography to finish: axe cannot resolve a
      // contrast background for the transparent header when it sits over an
      // image, so auditing mid-image-load yields timing-dependent false
      // positives. Once visible images have loaded those nodes are correctly
      // skipped as bg-undetermined.
      await page
        .waitForFunction(
          () => {
            const imgs = Array.from(document.images).filter((img) => {
              const rect = img.getBoundingClientRect()
              const style = window.getComputedStyle(img)
              return style.opacity !== '0' && rect.width > 0 && rect.height > 0
            })
            return imgs.every((img) => img.complete)
          },
          null,
          { timeout: 15_000 },
        )
        .catch(() => {})
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      for (const violation of results.violations) {
        if (violation.impact === 'critical' || violation.impact === 'serious') {
          found.push({
            route,
            id: violation.id,
            impact: violation.impact ?? 'n/a',
            targets: violation.nodes.map((node) => node.target.join(' ')),
          })
        }
      }
    }
    expect(found, `Automated audit must be clean of critical/serious violations:\n${JSON.stringify(found, null, 2)}`).toEqual([])
  })

  test('12 — validation errors are announced, associated with their field and recoverable', async ({ page }) => {
    // Contact: submitted empty form surfaces every error as an announced alert.
    await page.goto('/contact')
    await expect(page.getByRole('main')).toHaveCount(1)
    await page.getByRole('button', { name: 'Send Message' }).click()
    await expect(page.getByRole('alert')).toHaveCount(4)
    for (const id of ['name-error', 'email-error', 'subject-error', 'message-error']) {
      await expect(page.locator(`#${id}`)).toHaveRole('alert')
      await expect(page.locator(`#${id}`)).not.toBeEmpty()
    }

    // Reservation wizard: a closed-day date is called out in text, not colour.
    const futureMonday = await page.evaluate(() => {
      for (let i = 1; i <= 14; i++) {
        const candidate = new Date(Date.now() + i * 86400000)
        if (candidate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === 'monday') {
          return candidate.toISOString().slice(0, 10)
        }
      }
      return null
    })
    await page.goto('/reservations')
    await expect(page.getByRole('main')).toHaveCount(1)
    if (futureMonday) {
      await page.getByLabel('Date').fill(futureMonday)
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(page.locator('#date-error')).toHaveRole('alert')
      await expect(page.locator('#date-error')).not.toBeEmpty()
    }

    // Lookup: empty submission is announced and associated.
    await page.goto('/reservation-lookup')
    await expect(page.getByRole('main')).toHaveCount(1)
    const codeInput = page.getByLabel('Reference Code')
    const lookupEmail = page.getByLabel('Email').first()
    await page.getByRole('button', { name: 'Find Reservation' }).click()
    await expect(page.getByRole('alert')).toHaveCount(2)
    await expect(codeInput).toHaveAttribute('aria-invalid', 'true')
    await expect(codeInput).toHaveAttribute('aria-describedby', 'reference_code-error')
    await expect(lookupEmail).toHaveAttribute('aria-describedby', 'lookup-email-error')
  })

  test('13 — screen-reader semantics are present throughout critical flows', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Select language' })).toHaveAttribute('aria-haspopup', 'listbox')

    await page.goto('/about')
    await expect(
      page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Our Story' }),
    ).toHaveAttribute('aria-current', 'page')

    await page.goto('/gallery')
    const filterGroup = page.getByRole('group', { name: 'Browse the gallery by category' })
    await expect(filterGroup).toBeVisible()
    await expect(filterGroup.getByRole('button', { name: 'Food' })).toHaveAttribute('aria-pressed', 'false')

    await page.getByRole('button', { name: /^View / }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Image lightbox' })
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog.getByText(/^\d+ of \d+$/)).toBeVisible()
    await expect(dialog.locator('[aria-live="polite"]')).not.toBeEmpty()
    await page.keyboard.press('Escape')

    await page.goto('/reservation-lookup')
    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.getByRole('status')).toHaveCount(0)

    await page.goto('/contact')
    await expect(page.getByRole('main')).toHaveCount(1)
    await page.route('**/api/contact', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }),
    )
    await page.getByLabel('Name').fill('Alex Restaurant')
    await page.getByLabel('Email').fill('alex@example.com')
    await page.getByLabel('Subject').fill('Table for four')
    await page.getByLabel('Message').fill('We would love a table by the window.')
    await page.getByRole('button', { name: 'Send Message' }).click()
    await expect(page.getByRole('status').filter({ hasText: /Thank you/i })).toBeVisible()
  })
})

test.describe('accessibility — mobile menu interactions', () => {
  test.use({ viewport: { width: 420, height: 900 } })

  test('4 — the mobile menu is fully keyboard operable and returns focus to its trigger on close', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('main')).toHaveCount(1)

    const trigger = page.getByRole('button', { name: 'Open menu' })
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    // Open with the keyboard. The trigger's label flips to "Close menu" while
    // open; the overlay's own close button shares that name, so assert the
    // header trigger (first in DOM order) holds the expanded state.
    await trigger.focus()
    await page.keyboard.press('Enter')
    const closeTrigger = page.getByRole('button', { name: 'Close menu' }).first()
    await expect(closeTrigger).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(2)

    // The next tab stop lands inside the overlay (its close button first).
    await page.keyboard.press('Tab')
    const info = await activeElementInfo(page)
    expect(info.name).toBe('Close menu')

    // Escape closes and focus returns to the trigger after the exit transition.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(1)
    await expect.poll(async () => (await activeElementInfo(page)).name, { timeout: 4_000 }).toBe('Open menu')
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    // Close-button path also returns focus to the trigger. While open there are
    // two "Close menu" buttons (header trigger + overlay); the overlay one is
    // last in DOM order.
    await trigger.click()
    await page.getByRole('button', { name: 'Close menu' }).last().click()
    await expect.poll(async () => (await activeElementInfo(page)).name, { timeout: 4_000 }).toBe('Open menu')

    // A navigation click closes the menu and eventually returns focus to the
    // trigger. The overlay link is the first matching link in DOM order.
    await trigger.click()
    await page.getByRole('link', { name: 'Our Story' }).first().click()
    await expect(page).toHaveURL(/\/about/)
    await expect.poll(async () => (await activeElementInfo(page)).name, { timeout: 4_000 }).toBe('Open menu')
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')

    const errors = watchPageErrors(page)
    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })
})