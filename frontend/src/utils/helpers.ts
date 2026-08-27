import type { ApiError } from '../types'
import { getCurrentLocale } from './locale'

const API_BASE = import.meta.env.VITE_API_URL || ''

let logoutCallback: (() => void) | null = null

export function setAuthLogoutCallback(callback: (() => void) | null) {
  logoutCallback = callback
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return false

  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!response.ok) return false
    const data = await response.json()
    localStorage.setItem('auth_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    return true
  } catch {
    return false
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {}
  new Headers(options.headers).forEach((value, key) => {
    headers[key] = value
  })
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401 && token) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      const newToken = localStorage.getItem('auth_token')
      const retryHeaders: Record<string, string> = {}
      new Headers(options.headers).forEach((value, key) => {
        retryHeaders[key] = value
      })
      if (!(options.body instanceof FormData)) {
        retryHeaders['Content-Type'] = 'application/json'
      }
      if (newToken) {
        retryHeaders['Authorization'] = `Bearer ${newToken}`
      }
      const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: retryHeaders,
      })
      if (retryResponse.ok) {
        if (retryResponse.status === 204) return undefined as T
        return retryResponse.json()
      }
      if (retryResponse.status === 401) {
        logoutCallback?.()
        throw new Error('Session expired. Please log in again.')
      }
      const retryError: ApiError = await retryResponse.json().catch(() => ({ detail: 'Request failed' }))
      const retryMessage = typeof retryError.detail === 'string'
        ? retryError.detail
        : retryError.detail?.[0]?.msg || 'Request failed'
      throw new Error(retryMessage)
    }
    logoutCallback?.()
    throw new Error('Session expired. Please log in again.')
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

export function formatPrice(price: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat(getCurrentLocale(), {
    style: 'currency',
    currency,
  }).format(price)
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
  return new Date().toISOString().split('T')[0]
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
    location: location || 'Via Roma 42, 28100 Novara, Italy',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePhone(phone: string): boolean {
  return /^\+?[\d\s\-().]{7,20}$/.test(phone.trim())
}
