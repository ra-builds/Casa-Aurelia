import type { ApiError } from '../types'
import { SITE_CONFIG } from '../config/site'
import { getMinDate as getLocalMinDate } from './date'
import { getCurrentLocale } from './locale'
import { getAccessToken, setAccessToken } from './authToken'

const API_BASE = import.meta.env.VITE_API_URL || ''

let logoutCallback: (() => void) | null = null

export function setAuthLogoutCallback(callback: (() => void) | null) {
  logoutCallback = callback
}

// Single fetch helper. Sends cookies (credentials: 'include') so the HttpOnly
// refresh-token cookie is attached, and attaches the in-memory access token as a
// Bearer header only when withAuth is true.
async function rawFetch(
  endpoint: string,
  options: RequestInit = {},
  withAuth: boolean,
): Promise<Response> {
  const headers: Record<string, string> = {}
  new Headers(options.headers).forEach((value, key) => {
    headers[key] = value
  })
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const token = withAuth ? getAccessToken() : null
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  })
}

// Best-effort refresh of the access token. The refresh token travels in the
// HttpOnly cookie (no body token, no localStorage). On success the new access
// token is kept in memory. Never throws; returns success.
async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await rawFetch('/api/auth/refresh', { method: 'POST' }, false)
    if (!response.ok) return false
    const data = await response.json()
    setAccessToken(data.access_token)
    return true
  } catch {
    return false
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  let response = await rawFetch(endpoint, options, true)

  // A 401 on a request that carried a real access token means the token expired;
  // attempt one transparent refresh (single consolidated path — no duplicated
  // fetch/refresh logic).
  if (response.status === 401 && getAccessToken()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await rawFetch(endpoint, options, true)
    } else {
      logoutCallback?.()
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ detail: 'Request failed' }))
    const message = typeof error.detail === 'string'
      ? error.detail
      : error.detail?.[0]?.msg || 'Request failed'
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export function formatPrice(price: number, currency: string = SITE_CONFIG.defaultCurrency): string {
  return new Intl.NumberFormat(getCurrentLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(getCurrentLocale(), { useGrouping: true }).format(value)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(getCurrentLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function getMinDate(): string {
  return getLocalMinDate()
}

export function generateCalendarLink(
  title: string,
  date: string,
  time: string,
  description: string,
  location?: string,
): string {
  const start = `${date.replace(/-/g, '')}T${time.replace(':', '')}00`
  const endHour = parseInt(time.split(':')[0]) + 2
  const end = `${date.replace(/-/g, '')}T${String(endHour).padStart(2, '0')}${time.split(':')[1]}00`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details: description,
    location: location || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePhone(phone: string): boolean {
  return /^\+?[\d\s\-().]{7,20}$/.test(phone.trim())
}

const WEEKDAY_KEYS: Record<string, string> = {
  monday: 'home.monday',
  tuesday: 'home.tuesday',
  wednesday: 'home.wednesday',
  thursday: 'home.thursday',
  friday: 'home.friday',
  saturday: 'home.saturday',
  sunday: 'home.sunday',
}

// Maps a localized weekday display name to its existing i18n key. Used to keep
// the restaurant's closed_day label translated consistently across the site
// (same mapping as hours-location section), returning null for unrecognized
// values so callers fall back to the raw value.
export function resolveDayKey(value: string): string | null {
  return WEEKDAY_KEYS[value.trim().toLowerCase()] ?? null
}
