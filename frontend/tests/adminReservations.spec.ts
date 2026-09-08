import { expect, type APIRequestContext, type Page, type Response } from '@playwright/test'
import { test, watchPageErrors } from './helpers/fixtures'
import { adminLogin } from './helpers/auth'
import type { Reservation, ReservationStats } from '../src/types'
import { toLocalCalendarDate } from '../src/utils/date'

test.describe.configure({ mode: 'serial' })

const TIME_SLOTS = ['12:00', '12:30', '13:00', '13:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30']

let emailCounter = 0

function uniqueEmail(): string {
  emailCounter += 1
  return `e2e-admin-${Date.now()}-${emailCounter}@qa5.example`
}

function futureOpenDate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  while (d.getDay() === 1 || d.getDay() === 0) d.setDate(d.getDate() + 1)
  return toLocalCalendarDate(d)
}

function today(): string {
  return toLocalCalendarDate(new Date())
}

function bookingPayload(date: string, lastName: string, email?: string, time = '19:00', guests = 2) {
  return {
    first_name: 'AdminE2E',
    last_name: lastName,
    email: email ?? uniqueEmail(),
    phone: '+39 333 0000000',
    reservation_date: date,
    reservation_time: time,
    guests,
    special_requests: null,
  }
}

async function createReservationViaApi(request: APIRequestContext, payload: Record<string, unknown>): Promise<Reservation> {
  const res = await request.post('/api/reservations', { data: payload })
  expect(res.ok()).toBeTruthy()
  return (await res.json()) as Reservation
}

async function adminHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  const { accessToken } = await adminLogin(request)
  return { Authorization: `Bearer ${accessToken}` }
}

async function getStats(request: APIRequestContext): Promise<ReservationStats> {
  const headers = await adminHeaders(request)
  const res = await request.get('/api/reservations/stats', { headers })
  expect(res.ok()).toBeTruthy()
  return (await res.json()) as ReservationStats
}

async function getReservationByReference(request: APIRequestContext, referenceCode: string): Promise<Reservation | null> {
  const headers = await adminHeaders(request)
  const res = await request.get(`/api/reservations?search=${encodeURIComponent(referenceCode)}&page_size=100`, { headers })
  expect(res.ok()).toBeTruthy()
  const body = (await res.json()) as { items: Reservation[] }
  return body.items.find((reservation) => reservation.reference_code === referenceCode) ?? null
}

async function softDeleteById(request: APIRequestContext, id: number): Promise<void> {
  const headers = await adminHeaders(request)
  const res = await request.delete(`/api/reservations/${id}`, { headers })
  expect(res.status()).toBe(204)
}

async function deleteReservations(request: APIRequestContext, reservations: Reservation[]): Promise<void> {
  for (const reservation of reservations) {
    await softDeleteById(request, reservation.id)
  }
}

async function deleteForDate(request: APIRequestContext, date: string): Promise<void> {
  const headers = await adminHeaders(request)
  const res = await request.get(`/api/reservations?date=${date}&page_size=100`, { headers })
  expect(res.ok()).toBeTruthy()
  const body = (await res.json()) as { items: Reservation[] }
  for (const reservation of body.items) {
    const del = await request.delete(`/api/reservations/${reservation.id}`, { headers })
    expect(del.status()).toBe(204)
  }
}

interface ListQuery {
  search?: string
  status?: string
  date?: string
  page?: string
}

function listResponseWaiter(page: Page, query: ListQuery): Promise<void> {
  const matches = (response: Response): boolean => {
    if (response.request().method() !== 'GET') return false
    const url = new URL(response.url())
    if (url.pathname !== '/api/reservations') return false
    if (query.search !== undefined && (url.searchParams.get('search') ?? '') !== query.search) return false
    if (query.status !== undefined && (url.searchParams.get('status') ?? '') !== query.status) return false
    if (query.date !== undefined && (url.searchParams.get('date') ?? '') !== query.date) return false
    if (query.page !== undefined && (url.searchParams.get('page') ?? '') !== query.page) return false
    return true
  }
  return page.waitForResponse(matches).then(() => undefined)
}

async function filterSearch(page: Page, value: string): Promise<void> {
  const waiter = listResponseWaiter(page, { search: value })
  await page.getByLabel('Search by name, email, or reference...').fill(value)
  await waiter
}

test('admin dashboard lists a real reservation with its details', async ({ request, authenticatedAdminPage }) => {
  const page = authenticatedAdminPage
  const errors = watchPageErrors(page)
  const date = futureOpenDate(3)
  const reservation = await createReservationViaApi(request, bookingPayload(date, 'Qa5List', uniqueEmail(), '19:30'))

  await filterSearch(page, reservation.reference_code)

  const row = page.locator('tbody tr').filter({ hasText: reservation.reference_code })
  await expect(row).toHaveCount(1)
  await expect(row).toContainText('AdminE2E Qa5List')
  await expect(row).toContainText(reservation.reference_code)
  await expect(row).toContainText('19:30')
  await expect(row).toContainText('2')
  await expect(row).toContainText('+39 333 0000000')
  await expect(row.locator('.pill')).toHaveText('Pending')

  const statCard = (label: string) =>
    page.locator('.card.px-6').filter({ has: page.getByText(label, { exact: true }) })
  await expect(statCard('Total Reservations')).toBeVisible()
  await expect(statCard('Today')).toBeVisible()
  await expect(statCard('Guests Today')).toBeVisible()
  await expect(statCard('Upcoming')).toBeVisible()
  await expect(page.getByText('Pending:', { exact: false })).toBeVisible()
  await expect(page.getByText('Confirmed:', { exact: false })).toBeVisible()
  await expect(page.getByText('Cancelled:', { exact: false })).toBeVisible()

  await page.reload()
  await expect(page.getByText(reservation.reference_code, { exact: true })).toBeVisible()

  await deleteReservations(request, [reservation])
  await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
})

test('admin search narrows the list by name and email', async ({ request, authenticatedAdminPage }) => {
  const page = authenticatedAdminPage
  const errors = watchPageErrors(page)
  const zara = await createReservationViaApi(
    request,
    bookingPayload(futureOpenDate(4), 'Zara', uniqueEmail(), '19:00'),
  )
  const omar = await createReservationViaApi(
    request,
    bookingPayload(futureOpenDate(5), 'Omar', uniqueEmail(), '19:30'),
  )

  await filterSearch(page, 'Zara')
  await expect(page.locator('tbody tr').filter({ hasText: zara.reference_code })).toHaveCount(1)
  await expect(page.locator('tbody tr').filter({ hasText: omar.reference_code })).toHaveCount(0)

  await filterSearch(page, omar.email.slice(0, 'e2e-admin-'.length + 18))
  await expect(page.locator('tbody tr').filter({ hasText: omar.reference_code })).toHaveCount(1)
  await expect(page.locator('tbody tr').filter({ hasText: zara.reference_code })).toHaveCount(0)

  await filterSearch(page, '')
  await expect(page.locator('tbody tr').filter({ hasText: zara.reference_code })).toHaveCount(1)
  await expect(page.locator('tbody tr').filter({ hasText: omar.reference_code })).toHaveCount(1)

  await deleteReservations(request, [zara, omar])
  await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
})

test('admin status filter narrows the list to the selected status', async ({ request, authenticatedAdminPage }) => {
  const page = authenticatedAdminPage
  const errors = watchPageErrors(page)
  const date = futureOpenDate(6)
  const pending = await createReservationViaApi(request, bookingPayload(date, 'Qa5Status', uniqueEmail(), '19:00'))
  const confirmed = await createReservationViaApi(request, bookingPayload(date, 'Qa5Status', uniqueEmail(), '19:30'))
  const headers = await adminHeaders(request)
  const patch = await request.patch(`/api/reservations/${confirmed.id}`, { headers, data: { status: 'confirmed' } })
  expect(patch.status()).toBe(200)

  await filterSearch(page, 'Qa5Status')

  const statusWaiter = listResponseWaiter(page, { search: 'Qa5Status', status: 'pending' })
  await page.getByLabel('Filter by status').selectOption('pending')
  await statusWaiter
  await expect(page.locator('tbody tr').filter({ hasText: pending.reference_code })).toHaveCount(1)
  await expect(page.locator('tbody tr').filter({ hasText: confirmed.reference_code })).toHaveCount(0)
  await expect(page.locator('tbody tr').filter({ hasText: confirmed.reference_code }).locator('.pill')).toHaveCount(0)

  const confirmedWaiter = listResponseWaiter(page, { search: 'Qa5Status', status: 'confirmed' })
  await page.getByLabel('Filter by status').selectOption('confirmed')
  await confirmedWaiter
  await expect(page.locator('tbody tr').filter({ hasText: confirmed.reference_code })).toHaveCount(1)
  await expect(page.locator('tbody tr').filter({ hasText: pending.reference_code })).toHaveCount(0)
  await expect(page.locator('tbody tr').filter({ hasText: confirmed.reference_code }).locator('.pill')).toHaveText('Confirmed')

  const allWaiter = listResponseWaiter(page, { search: 'Qa5Status', status: '' })
  await page.getByLabel('Filter by status').selectOption('')
  await allWaiter
  await expect(page.locator('tbody tr').filter({ hasText: pending.reference_code })).toHaveCount(1)
  await expect(page.locator('tbody tr').filter({ hasText: confirmed.reference_code })).toHaveCount(1)

  await deleteReservations(request, [pending, confirmed])
  await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
})

test('admin date filter and Today button scope the list by date', async ({ request, authenticatedAdminPage }) => {
  const page = authenticatedAdminPage
  const errors = watchPageErrors(page)
  const later = await createReservationViaApi(
    request,
    bookingPayload(futureOpenDate(7), 'Qa5Date', uniqueEmail(), '19:00'),
  )
  const sooner = await createReservationViaApi(
    request,
    bookingPayload(futureOpenDate(10), 'Qa5Date', uniqueEmail(), '19:30'),
  )

  await filterSearch(page, 'Qa5Date')

  const laterWaiter = listResponseWaiter(page, { search: 'Qa5Date', date: later.reservation_date })
  await page.getByLabel('Filter by date').fill(later.reservation_date)
  await laterWaiter
  await expect(page.locator('tbody tr').filter({ hasText: later.reference_code })).toHaveCount(1)
  await expect(page.locator('tbody tr').filter({ hasText: sooner.reference_code })).toHaveCount(0)

  const soonerWaiter = listResponseWaiter(page, { search: 'Qa5Date', date: sooner.reservation_date })
  await page.getByLabel('Filter by date').fill(sooner.reservation_date)
  await soonerWaiter
  await expect(page.locator('tbody tr').filter({ hasText: sooner.reference_code })).toHaveCount(1)
  await expect(page.locator('tbody tr').filter({ hasText: later.reference_code })).toHaveCount(0)

  const todayValue = today()
  const todayWaiter = listResponseWaiter(page, { search: 'Qa5Date', date: todayValue })
  await page.getByRole('button', { name: 'Today' }).click()
  await todayWaiter
  await expect(page.getByLabel('Filter by date')).toHaveValue(todayValue)
  await expect(page.locator('tbody tr').filter({ hasText: later.reference_code })).toHaveCount(0)
  await expect(page.locator('tbody tr').filter({ hasText: sooner.reference_code })).toHaveCount(0)

  await deleteReservations(request, [later, sooner])
  await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
})

test('admin confirming a reservation updates the UI, persists, and is visible via the API', async ({ request, authenticatedAdminPage }) => {
  const page = authenticatedAdminPage
  const errors = watchPageErrors(page)
  const baseline = await getStats(request)
  const date = futureOpenDate(9)
  const reservation = await createReservationViaApi(request, bookingPayload(date, 'Qa5Confirm', uniqueEmail(), '20:00'))

  await filterSearch(page, reservation.reference_code)
  const row = page.locator('tbody tr').filter({ hasText: reservation.reference_code })
  await expect(row.locator('.pill')).toHaveText('Pending')

  const patchWaiter = page.waitForResponse(
    (response) => response.request().method() === 'PATCH' && /\/api\/reservations\/\d+$/.test(new URL(response.url()).pathname),
  )
  await row.getByRole('button', { name: 'Confirm' }).click()
  await patchWaiter

  await expect(row.locator('.pill')).toHaveText('Confirmed')
  const after = await getStats(request)
  expect(after.confirmed).toBe(baseline.confirmed + 1)
  await expect(page.getByText(`Confirmed: ${after.confirmed}`, { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByText(reservation.reference_code, { exact: true })).toBeVisible()
  const persistedRow = page.locator('tbody tr').filter({ hasText: reservation.reference_code })
  await expect(persistedRow.locator('.pill')).toHaveText('Confirmed')

  const fromApi = await getReservationByReference(request, reservation.reference_code)
  expect(fromApi?.status).toBe('confirmed')

  await deleteReservations(request, [reservation])
  await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
})

test('admin cancelling a reservation updates the UI, persists, and is visible via the API', async ({ request, authenticatedAdminPage }) => {
  const page = authenticatedAdminPage
  const errors = watchPageErrors(page)
  const date = futureOpenDate(10)
  const reservation = await createReservationViaApi(request, bookingPayload(date, 'Qa5CancelA', uniqueEmail(), '20:30'))

  await filterSearch(page, reservation.reference_code)
  const row = page.locator('tbody tr').filter({ hasText: reservation.reference_code })
  await expect(row.locator('.pill')).toHaveText('Pending')

  const patchWaiter = page.waitForResponse(
    (response) => response.request().method() === 'PATCH' && /\/api\/reservations\/\d+$/.test(new URL(response.url()).pathname),
  )
  await row.getByRole('button', { name: 'Cancel' }).click()
  await patchWaiter

  await expect(row.locator('.pill')).toHaveText('Cancelled')

  await page.reload()
  await expect(page.getByText(reservation.reference_code, { exact: true })).toBeVisible()
  const persistedRow = page.locator('tbody tr').filter({ hasText: reservation.reference_code })
  await expect(persistedRow.locator('.pill')).toHaveText('Cancelled')

  const fromApi = await getReservationByReference(request, reservation.reference_code)
  expect(fromApi?.status).toBe('cancelled')

  await deleteReservations(request, [reservation])
  await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
})

test('admin deleting a reservation removes it from the list and the API', async ({ request, authenticatedAdminPage }) => {
  const page = authenticatedAdminPage
  const errors = watchPageErrors(page)
  const date = futureOpenDate(11)
  const reservation = await createReservationViaApi(request, bookingPayload(date, 'Qa5DeleteA', uniqueEmail(), '21:00'))

  await filterSearch(page, reservation.reference_code)
  const row = page.locator('tbody tr').filter({ hasText: reservation.reference_code })
  await expect(row).toHaveCount(1)

  page.on('dialog', (dialog) => dialog.accept())
  const deleteWaiter = page.waitForResponse(
    (response) => response.request().method() === 'DELETE' && /\/api\/reservations\/\d+$/.test(new URL(response.url()).pathname),
  )
  await row.getByRole('button', { name: 'Delete' }).click()
  await deleteWaiter

  await expect(row).toHaveCount(0)

  const headers = await adminHeaders(request)
  const gone = await request.get(`/api/reservations/${reservation.id}`, { headers })
  expect(gone.status()).toBe(404)
  const afterDelete = await getReservationByReference(request, reservation.reference_code)
  expect(afterDelete).toBeNull()

  await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
})

test('dashboard status pills reflect the confirmed count after an admin action', async ({ request, authenticatedAdminPage }) => {
  const page = authenticatedAdminPage
  const errors = watchPageErrors(page)
  const baseline = await getStats(request)
  const date = futureOpenDate(12)
  const first = await createReservationViaApi(request, bookingPayload(date, 'Qa5StatsA', uniqueEmail(), '19:00'))
  const second = await createReservationViaApi(request, bookingPayload(date, 'Qa5StatsB', uniqueEmail(), '19:30'))

  await filterSearch(page, 'Qa5Stats')
  const confirmedRow = page.locator('tbody tr').filter({ hasText: first.reference_code })
  const patchWaiter = page.waitForResponse(
    (response) => response.request().method() === 'PATCH' && /\/api\/reservations\/\d+$/.test(new URL(response.url()).pathname),
  )
  await confirmedRow.getByRole('button', { name: 'Confirm' }).click()
  await patchWaiter

  const after = await getStats(request)
  expect(after.confirmed).toBe(baseline.confirmed + 1)
  await expect(page.getByText(`Confirmed: ${after.confirmed}`, { exact: true })).toBeVisible()

  for (const label of ['Total Reservations', 'Today', 'Guests Today', 'Upcoming']) {
    const card = page.locator('.card.px-6').filter({ has: page.getByText(label, { exact: true }) })
    await expect(card.locator('p.font-display')).toHaveText(/\d+/)
  }

  await deleteReservations(request, [first, second])
  await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
})

test('an admin-confirmed reservation is visible to the customer through the public lookup', async ({ request, authenticatedAdminPage }) => {
  const page = authenticatedAdminPage
  const errors = watchPageErrors(page)
  const date = futureOpenDate(13)
  const reservation = await createReservationViaApi(request, bookingPayload(date, 'Qa5CrossA', uniqueEmail(), '21:30'))

  await filterSearch(page, reservation.reference_code)
  const row = page.locator('tbody tr').filter({ hasText: reservation.reference_code })
  const patchWaiter = page.waitForResponse(
    (response) => response.request().method() === 'PATCH' && /\/api\/reservations\/\d+$/.test(new URL(response.url()).pathname),
  )
  await row.getByRole('button', { name: 'Confirm' }).click()
  await patchWaiter
  await expect(row.locator('.pill')).toHaveText('Confirmed')

  await page.reload()
  await expect(page.getByText(reservation.reference_code, { exact: true })).toBeVisible()

  await page.goto('/reservation-lookup')
  await page.locator('#reference_code').fill(reservation.reference_code)
  await page.locator('#lookup-email').fill(reservation.email)
  const lookupWaiter = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/api/reservations/lookup'),
  )
  await page.getByRole('button', { name: 'Find Reservation' }).click()
  await lookupWaiter

  await expect(page.getByText(reservation.reference_code, { exact: true })).toBeVisible()
  await expect(page.getByText('Confirmed', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel Reservation' })).toBeVisible()

  await deleteReservations(request, [reservation])
  await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
})

test('unauthenticated visit to the admin area shows only the staff login', async ({ page }) => {
  const errors = watchPageErrors(page)
  await page.goto('/admin')

  await expect(page.locator('#admin-email')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  await expect(page.getByRole('tablist')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toHaveCount(0)
  await expect(page.getByText('Total Reservations')).toHaveCount(0)
  await expect(page.locator('tbody')).toHaveCount(0)

  await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
})

test('admin list paginates 20 rows per page', async ({ request, authenticatedAdminPage }) => {
  test.setTimeout(90_000)
  const page = authenticatedAdminPage
  const errors = watchPageErrors(page)
  const date = futureOpenDate(14)
  const created: Reservation[] = []
  for (let i = 0; i < 21; i += 1) {
    created.push(
      await createReservationViaApi(
        request,
        bookingPayload(date, 'Qa5Paginate', uniqueEmail(), TIME_SLOTS[i % TIME_SLOTS.length], 1),
      ),
    )
  }

  const dateWaiter = listResponseWaiter(page, { date })
  await page.getByLabel('Filter by date').fill(date)
  await dateWaiter

  const navigation = page.getByRole('navigation', { name: 'Reservation list pagination' })
  await expect(navigation).toBeVisible()
  await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible()
  await expect(page.getByText(/Showing\s+1–20 of 21/)).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(20)
  await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled()

  const pageTwoWaiter = listResponseWaiter(page, { date, page: '2' })
  await page.getByRole('button', { name: 'Next page' }).click()
  await pageTwoWaiter

  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Showing 21–21 of 21', { exact: true })).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled()

  await deleteForDate(request, date)
  await expect.poll(() => errors(), { timeout: 3_000 }).toEqual([])
})