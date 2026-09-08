import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { test, watchPageErrors } from './helpers/fixtures'
import { adminLogin } from './helpers/auth'
import type { Reservation } from '../src/types'
import { toLocalCalendarDate } from '../src/utils/date'

const GUEST = {
  first_name: 'Elena',
  last_name: 'Bianchi',
  phone: '+39 333 1234567',
}

let emailCounter = 0

function uniqueEmail(): string {
  emailCounter += 1
  return `e2e-${Date.now()}-${emailCounter}@qa4.example`
}

function futureOpenDate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  while (d.getDay() === 1 || d.getDay() === 0) d.setDate(d.getDate() + 1)
  return toLocalCalendarDate(d)
}

function nextMonday(): string {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  return toLocalCalendarDate(d)
}

function pastDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toLocalCalendarDate(d)
}

function bookingPayload(overrides: { date: string; time?: string; guests?: number; email?: string }) {
  return {
    first_name: GUEST.first_name,
    last_name: GUEST.last_name,
    email: overrides.email ?? uniqueEmail(),
    phone: GUEST.phone,
    reservation_date: overrides.date,
    reservation_time: overrides.time ?? '19:00',
    guests: overrides.guests ?? 2,
    special_requests: null,
  }
}

interface SlotAvailability {
  available: boolean
  remaining_capacity: number
  message: string
}

async function checkAvailability(
  request: APIRequestContext,
  date: string,
  time: string,
  guests: number,
): Promise<SlotAvailability> {
  const res = await request.get(`/api/reservations/availability?date=${date}&time=${time}&guests=${guests}`)
  expect(res.ok()).toBeTruthy()
  return (await res.json()) as SlotAvailability
}

async function createReservationViaApi(
  request: APIRequestContext,
  payload: Record<string, unknown>,
): Promise<Reservation> {
  const res = await request.post('/api/reservations', { data: payload })
  expect(res.ok()).toBeTruthy()
  return (await res.json()) as Reservation
}

async function adminHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  const { accessToken } = await adminLogin(request)
  return { Authorization: `Bearer ${accessToken}` }
}

async function softDeleteReservationsForDate(request: APIRequestContext, date: string): Promise<void> {
  const headers = await adminHeaders(request)
  const res = await request.get(`/api/reservations?date=${date}&page_size=100`, { headers })
  const body = (await res.json()) as { items: Reservation[] }
  for (const reservation of body.items) {
    const del = await request.delete(`/api/reservations/${reservation.id}`, { headers })
    expect(del.status()).toBe(204)
  }
}

async function createClosure(request: APIRequestContext, date: string): Promise<{ id: number }> {
  const headers = await adminHeaders(request)
  const res = await request.post('/api/admin/closures', {
    headers,
    data: { closure_date: date, reason: 'QA-4 E2E blackout test' },
  })
  expect(res.status()).toBe(201)
  return (await res.json()) as { id: number }
}

async function deleteClosure(request: APIRequestContext, id: number): Promise<void> {
  const headers = await adminHeaders(request)
  const res = await request.delete(`/api/admin/closures/${id}`, { headers })
  expect(res.status()).toBe(204)
}

async function setDate(page: Page, isoDate: string): Promise<void> {
  await page.locator('#date').fill(isoDate)
}

async function reachTimeStep(page: Page, date: string, guests = 2): Promise<void> {
  await page.goto('/reservations')
  await setDate(page, date)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: String(guests), exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
}

async function selectTimeSlot(page: Page, slot: string): Promise<SlotAvailability> {
  const response = page.waitForResponse(
    (r) => r.url().includes('/api/reservations/availability') && r.request().method() === 'GET',
  )
  await page.getByRole('button', { name: slot, exact: true }).click()
  const res = await response
  expect(res.ok()).toBeTruthy()
  return (await res.json()) as SlotAvailability
}

async function fillDetails(page: Page, email: string): Promise<void> {
  await page.locator('#first_name').fill(GUEST.first_name)
  await page.locator('#last_name').fill(GUEST.last_name)
  await page.locator('#email').fill(email)
  await page.locator('#phone').fill(GUEST.phone)
  await page.locator('#special_requests').fill('Window seat, please.')
}

async function goToReview(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('button', { name: 'Confirm reservation' })).toBeVisible()
}

async function submitConfirmation(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Confirm reservation' }).click()
  await expect(page).toHaveURL(/\/reservation-confirmed$/)
  const ref = await page.getByText(/^CASA-[0-9A-F]{6}$/).first().textContent()
  expect(ref).toBeTruthy()
  return (ref as string).trim()
}

async function bookViaUi(
  page: Page,
  opts: { date: string; slot: string; guests?: number; email?: string },
): Promise<string> {
  await reachTimeStep(page, opts.date, opts.guests ?? 2)
  const avail = await selectTimeSlot(page, opts.slot)
  expect(avail.available).toBe(true)
  await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
  await page.getByRole('button', { name: 'Next' }).click()
  await fillDetails(page, opts.email ?? uniqueEmail())
  await goToReview(page)
  return submitConfirmation(page)
}

test.describe('reservation – happy path & persistence', () => {
  test('a guest books a table through the real wizard and the booking persists', async ({ page, request }) => {
    const errors = watchPageErrors(page)
    const date = futureOpenDate(7)
    const email = uniqueEmail()
    const slot = '19:00'
    const guestCount = 2
    try {
      const before = await checkAvailability(request, date, slot, guestCount)

      await reachTimeStep(page, date, guestCount)
      const avail = await selectTimeSlot(page, slot)
      expect(avail.available).toBe(true)
      await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
      await page.getByRole('button', { name: 'Next' }).click()

      await fillDetails(page, email)
      await goToReview(page)
      const review = page.locator('.card dl')
      await expect(review).toContainText(`${GUEST.first_name} ${GUEST.last_name}`)
      await expect(review).toContainText(slot)
      await expect(review).toContainText(String(guestCount))
      await expect(review).toContainText(email)
      await expect(review).toContainText('Window seat, please.')

      const ref = await submitConfirmation(page)
      expect(ref).toMatch(/^CASA-[0-9A-F]{6}$/)
      await expect(page.getByRole('heading', { name: /Your table is reserved/ })).toBeVisible()
      await expect(page.getByText(/could not send a confirmation email/)).toBeVisible()

      const lookupRes = await request.post('/api/reservations/lookup', {
        data: { reference_code: ref, email },
      })
      expect(lookupRes.status()).toBe(200)
      const found = (await lookupRes.json()) as Reservation
      expect(found.reference_code).toBe(ref)
      expect(found.status).toBe('pending')
      expect(found.email).toBe(email)
      expect(found.first_name).toBe(GUEST.first_name)
      expect(found.guests).toBe(guestCount)
      expect(found.reservation_time).toBe(slot)
      expect(found.reservation_date).toBe(date)

      const after = await checkAvailability(request, date, slot, guestCount)
      expect(after.remaining_capacity).toBe(before.remaining_capacity - guestCount)

      await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
    } finally {
      await softDeleteReservationsForDate(request, date)
    }
  })
})

test.describe('reservation – lookup & cancellation', () => {
  test('a customer looks up their booking and cancels it', async ({ page, request }) => {
    const errors = watchPageErrors(page)
    const date = futureOpenDate(9)
    const email = uniqueEmail()
    try {
      const created = await createReservationViaApi(request, bookingPayload({ date, time: '19:30', email }))

      await page.goto('/reservation-lookup')
      await page.locator('#reference_code').fill(created.reference_code)
      await page.locator('#lookup-email').fill(email)
      const lookupResponse = page.waitForResponse(
        (r) => r.url().includes('/api/reservations/lookup') && r.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Find Reservation' }).click()
      expect((await lookupResponse).status()).toBe(200)

      await expect(page.getByText(created.reference_code, { exact: true })).toBeVisible()
      await expect(page.getByText('Pending')).toBeVisible()
      await expect(page.getByText(`${created.first_name} ${created.last_name}`)).toBeVisible()

      await page.getByRole('button', { name: 'Cancel Reservation' }).click()
      await expect(page.getByText(/Are you sure you want to cancel/)).toBeVisible()
      await page.getByRole('button', { name: 'Keep Reservation' }).click()
      await expect(page.getByText(/Are you sure you want to cancel/)).toHaveCount(0)

      await page.getByRole('button', { name: 'Cancel Reservation' }).click()
      const cancelResponse = page.waitForResponse(
        (r) => r.url().includes('/api/reservations/customer/cancel') && r.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Yes, Cancel' }).click()
      await cancelResponse

      await expect(page.getByText('Your reservation has been successfully cancelled.')).toBeVisible()
      await expect(page.getByText('Cancelled', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Cancel Reservation' })).toHaveCount(0)

      await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
    } finally {
      await softDeleteReservationsForDate(request, date)
    }
  })

  test('lookup validates required fields and rejects a wrong email', async ({ page, request }) => {
    const date = futureOpenDate(10)
    const email = uniqueEmail()
    let ref = ''
    try {
      const created = await createReservationViaApi(request, bookingPayload({ date, email }))
      ref = created.reference_code

      await page.goto('/reservation-lookup')
      await page.getByRole('button', { name: 'Find Reservation' }).click()
      await expect(page.getByRole('alert').filter({ hasText: 'Reference code is required' })).toBeVisible()
      await expect(page.getByRole('alert').filter({ hasText: 'Email address is required' })).toBeVisible()

      await page.locator('#reference_code').fill(ref)
      await page.locator('#lookup-email').fill(uniqueEmail())
      const wrongLookupResponse = page.waitForResponse(
        (r) => r.url().includes('/api/reservations/lookup') && r.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Find Reservation' }).click()
      expect((await wrongLookupResponse).status()).toBe(404)
      await expect(page.getByRole('alert')).toContainText(
        'Reservation not found. Please check your reference code and email.',
      )
    } finally {
      await softDeleteReservationsForDate(request, date)
    }
  })
})

test.describe('reservation – business rules', () => {
  test('the weekly closed day (Monday) is not bookable', async ({ page, request }) => {
    const monday = nextMonday()
    const errors = watchPageErrors(page)

    await page.goto('/reservations')
    await setDate(page, monday)

    await expect(page.getByText(/closed on Mondays/).first()).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Choose a date' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()

    const avail = await checkAvailability(request, monday, '12:00', 2)
    expect(avail.available).toBe(false)
    expect(avail.message).toContain('closed on Mondays')

    const createRes = await request.post('/api/reservations', { data: bookingPayload({ date: monday }) })
    expect(createRes.status()).toBe(409)
    expect(((await createRes.json()) as { detail: string }).detail).toContain('Mondays')

    await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
  })

  test('an explicit closure (blackout) date is not bookable', async ({ page, request }) => {
    const date = futureOpenDate(5)
    const closure = await createClosure(request, date)
    try {
      await reachTimeStep(page, date, 2)
      const avail = await selectTimeSlot(page, '19:00')
      expect(avail.available).toBe(false)
      expect(avail.message).toContain('Restaurant is closed on this date.')
      await expect(page.getByRole('status').filter({ hasText: 'Fully booked' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
    } finally {
      await deleteClosure(request, closure.id)
    }
  })

  test('a fully occupied slot is not bookable', async ({ page, request }) => {
    const date = futureOpenDate(11)
    try {
      for (const guests of [12, 12, 12, 4]) {
        await createReservationViaApi(request, bookingPayload({ date, time: '20:00', guests }))
      }

      await reachTimeStep(page, date, 2)
      const avail = await selectTimeSlot(page, '20:00')
      expect(avail.available).toBe(false)
      expect(avail.remaining_capacity).toBe(0)
      await expect(page.getByRole('status').filter({ hasText: 'Fully booked' })).toBeVisible()
      await expect(page.getByRole('status').filter({ hasText: /seats remaining/ })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
    } finally {
      await softDeleteReservationsForDate(request, date)
    }
  })

  test('capacity boundary: the exact remaining seats book and one more is rejected', async ({ page, request }) => {
    const date = futureOpenDate(13)
    try {
      for (const guests of [12, 12, 12, 2]) {
        await createReservationViaApi(request, bookingPayload({ date, time: '21:00', guests }))
      }

      const fits = await checkAvailability(request, date, '21:00', 2)
      expect(fits.available).toBe(true)
      expect(fits.remaining_capacity).toBe(2)

      const overflow = await checkAvailability(request, date, '21:00', 3)
      expect(overflow.available).toBe(false)

      const email = uniqueEmail()
      const ref = await bookViaUi(page, { date, slot: '21:00', email })
      expect(ref).toMatch(/^CASA-[0-9A-F]{6}$/)

      const blocked = await request.post('/api/reservations', {
        data: bookingPayload({ date, time: '21:00', guests: 2 }),
      })
      expect(blocked.status()).toBe(409)
      expect(((await blocked.json()) as { detail: string }).detail).toContain('seats remaining')
    } finally {
      await softDeleteReservationsForDate(request, date)
    }
  })

  test('party size is bounded to a 1–12 grid with the API contract aligned', async ({ page, request }) => {
    const date = futureOpenDate(15)
    await page.goto('/reservations')
    await setDate(page, date)
    await page.getByRole('button', { name: 'Next' }).click()

    for (let n = 1; n <= 12; n += 1) {
      await expect(page.getByRole('button', { name: String(n), exact: true })).toBeVisible()
    }
    await page.getByRole('button', { name: '12', exact: true }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('button', { name: '12:00', exact: true })).toBeVisible()

    const tooMany = await request.post('/api/reservations', { data: bookingPayload({ date, guests: 13 }) })
    expect(tooMany.status()).toBe(422)
    const tooFew = await request.post('/api/reservations', { data: bookingPayload({ date, guests: 0 }) })
    expect(tooFew.status()).toBe(422)
  })

  test('invalid customer input blocks submission and recovers once corrected', async ({ page }) => {
    const date = futureOpenDate(19)
    await reachTimeStep(page, date, 2)
    const avail = await selectTimeSlot(page, '19:00')
    expect(avail.available).toBe(true)
    await page.getByRole('button', { name: 'Next' }).click()

    await page.locator('#first_name').fill('')
    await page.locator('#last_name').fill('')
    await page.locator('#email').fill('not-an-email')
    await page.locator('#phone').fill('12')
    await page.getByRole('button', { name: 'Next' }).click()

    const alerts = page.getByRole('alert')
    await expect(alerts).toHaveCount(4)
    await expect(alerts.filter({ hasText: 'First name is required' })).toBeVisible()
    await expect(alerts.filter({ hasText: 'Last name is required' })).toBeVisible()
    await expect(alerts.filter({ hasText: 'Invalid email address' })).toBeVisible()
    await expect(alerts.filter({ hasText: 'Invalid phone number' })).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()

    await page.locator('#first_name').fill(GUEST.first_name)
    await page.locator('#last_name').fill(GUEST.last_name)
    await page.locator('#email').fill(uniqueEmail())
    await page.locator('#phone').fill(GUEST.phone)
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('button', { name: 'Confirm reservation' })).toBeVisible()
  })

  test('past dates cannot be booked and are rejected by the date picker minimum', async ({ page, request }) => {
    const today = toLocalCalendarDate(new Date())
    await page.goto('/reservations')
    await expect(page.locator('#date')).toHaveAttribute('min', today)

    await setDate(page, pastDate())
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('alert')).toContainText('Please choose a date in the future.')
    await expect(page.locator('#date')).toBeVisible()

    const createRes = await request.post('/api/reservations', { data: bookingPayload({ date: pastDate() }) })
    expect(createRes.status()).toBe(422)
  })

  test('a duplicate booking for the same customer, date and time is rejected', async ({ page, request }) => {
    const date = futureOpenDate(17)
    const email = uniqueEmail()
    try {
      await createReservationViaApi(request, bookingPayload({ date, time: '19:00', email }))

      await reachTimeStep(page, date, 2)
      const avail = await selectTimeSlot(page, '19:00')
      expect(avail.available).toBe(true)
      await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
      await page.getByRole('button', { name: 'Next' }).click()

      await page.locator('#first_name').fill(GUEST.first_name)
      await page.locator('#last_name').fill(GUEST.last_name)
      await page.locator('#email').fill(email)
      await page.locator('#phone').fill(GUEST.phone)
      await goToReview(page)
      await page.getByRole('button', { name: 'Confirm reservation' }).click()

      await expect(page.getByRole('alert')).toContainText(
        'You already have a reservation for this date and time.',
      )
      await expect(page).toHaveURL(/\/reservations$/)
    } finally {
      await softDeleteReservationsForDate(request, date)
    }
  })
})

test.describe('reservation – email safety', () => {
  test('no real email is sent when SMTP is not configured; booking still succeeds', async ({ page, request }) => {
    const date = futureOpenDate(21)
    const email = uniqueEmail()
    try {
      const ref = await bookViaUi(page, { date, slot: '12:00', email })
      expect(ref).toMatch(/^CASA-[0-9A-F]{6}$/)
      await expect(page.getByText(/could not send a confirmation email/)).toBeVisible()

      const apiRes = await request.post('/api/reservations', {
        data: bookingPayload({ date, time: '19:30' }),
      })
      expect(apiRes.status()).toBe(201)
      const apiBooking = (await apiRes.json()) as Reservation
      expect(apiBooking.email_sent).toBe(false)
    } finally {
      await softDeleteReservationsForDate(request, date)
    }
  })
})