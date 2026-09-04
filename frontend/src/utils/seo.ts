import type { Restaurant } from '../types'
import { SITE_CONFIG } from '../config/site'

/**
 * Casa Aurelia SEO (Original Phase 14) — pure, locale- and data-driven helpers.
 *
 * BUSINESS DATA != PRESENTATION (the Phase 13 principle) also holds here:
 * these functions take real business data (restaurant fields, pathnames,
 * origins) and locale and produce metadata strings / structured-data objects.
 * No fake domain, no fake reviews, no fake hours are ever emitted.
 *
 * The STATIC brand identity (site name, default title, default OG image) is
 * sourced from the single customization point `src/config/site.ts` (Original
 * Phase 17) rather than being re-declared here, so a client variant re-brands
 * the metadata from one place. Live business data still comes from
 * `GET /api/restaurant` via RestaurantContext.
 */
export const SITE_NAME = SITE_CONFIG.brandName
export const DEFAULT_TITLE = SITE_CONFIG.defaultTitle

/**
 * Production site origin, read from the build-time environment. This is the
 * single configuration point for the production origin used by canonical URLs,
 * the sitemap, and Open Graph absolute URLs. It follows the existing
 * `VITE_API_URL` pattern (see `utils/helpers.ts`). Empty in development /
 * until set at the production build — see Phase 14 report, "Architecture
 * inspected" and "Known limitations".
 */
export const SITE_URL: string = import.meta.env.VITE_SITE_URL || ''
export const SITE_URL_SET: boolean = Boolean(SITE_URL)

/**
 * A single, verified, resolvable image appropriate for general social sharing
 * (the candle-lit dining room), sourced from the site configuration.
 */
export const DEFAULT_OG_IMAGE = SITE_CONFIG.ogImage
export const DEFAULT_OG_IMAGE_ALT = SITE_CONFIG.ogImageAlt

/**
 * Map the app's 5 supported language codes to the Open Graph `og:locale`
 * value (BCP-47 with underscore). Matches `utils/locale.ts` BCP-47 mapping.
 */
const OG_LOCALE: Record<string, string> = {
  en: 'en_GB',
  it: 'it_IT',
  fr: 'fr_FR',
  de: 'de_DE',
  es: 'es_ES',
}

export function getOgLocale(lang: string): string {
  return OG_LOCALE[lang] ?? 'en_GB'
}

/**
 * Build an absolute canonical URL from a production origin and a pathname.
 * - Strips query parameters (canonical URLs never contain query strings).
 * - Handles trailing-slash on the origin and guarantees a leading slash on the
 *   path.
 * - When no origin is configured (dev / pre-deploy), returns the path-only URL
 *   rather than inventing a false domain.
 */
export function buildCanonicalUrl(origin: string, path: string): string {
  const base = origin ? origin.replace(/\/+$/, '') : ''
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (!base) return cleanPath
  return `${base}${cleanPath === '/' ? '' : cleanPath}`
}

const DAY_NAME_TO_ISO: Record<string, string> = {
  Monday: 'Mo',
  Tuesday: 'Tu',
  Wednesday: 'We',
  Thursday: 'Th',
  Friday: 'Fr',
  Saturday: 'Sa',
  Sunday: 'Su',
}

const WEEKDAYS_ISO = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function padTime(value: string): string {
  const m = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return value
  return `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`
}

/**
 * Parse a free-text display range such as "12:00 – 14:00" (the restaurant's
 * stored `lunch_hours` / `dinner_hours`) into structured `{ opens, closes }`.
 * Tolerant of an en-dash / hyphen and optional spaces. Returns null when it
 * cannot be confidently parsed so the caller can omit rather than guess.
 */
export function parseHoursRange(raw: string): { opens: string; closes: string } | null {
  if (!raw) return null
  const match = raw.match(/(\d{1,2}:\d{2})\s*[\u2013\u2014-]\s*(\d{1,2}:\d{2})/)
  if (!match) return null
  return { opens: padTime(match[1]), closes: padTime(match[2]) }
}

/**
 * Derive Schema.org `openingHoursSpecification` truthfully from the restaurant
 * data: a single `closed_day` and the stored `lunch_hours` / `dinner_hours`
 * display ranges applied to every open day. If either range cannot be parsed,
 * or the closed day is not one of the weekday names, the whole array is
 * omitted (no invented hours). Days are emitted with their ISO short names.
 */
export function buildOpeningHoursSpecification(restaurant: Pick<
  Restaurant,
  'closed_day' | 'lunch_hours' | 'dinner_hours'
>): Array<{ '@type': string; dayOfWeek: string[]; opens: string; closes: string }> {
  const closedIso = DAY_NAME_TO_ISO[restaurant.closed_day ?? '']
  const lunch = parseHoursRange(restaurant.lunch_hours ?? '')
  const dinner = parseHoursRange(restaurant.dinner_hours ?? '')
  if (!closedIso || !lunch || !dinner) return []

  const openDays = WEEKDAYS_ISO.filter((day) => day !== closedIso)
  const specs: Array<{ '@type': string; dayOfWeek: string[]; opens: string; closes: string }> = []

  for (const day of openDays) {
    if (lunch) specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: [day], opens: lunch.opens, closes: lunch.closes })
    if (dinner) specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: [day], opens: dinner.opens, closes: dinner.closes })
  }

  return specs
}

/**
 * Derive a truthful `servesCuisine` value from the restaurant's own description
 * only. Returns null when the cuisine cannot be inferred, rather than inventing.
 */
export function deriveServesCuisine(restaurant: Pick<Restaurant, 'tagline'>): string[] | null {
  const text = `${restaurant.tagline ?? ''} ${restaurant.tagline ?? ''}`.toLowerCase()
  if (text.includes('italian')) return ['Italian']
  return null
}

/**
 * Build the Restaurant / LocalBusiness JSON-LD object using ONLY fields the
 * application already stores. `sameAs` and `priceRange` are intentionally
 * omitted (seed social URLs are not externally verified; no prices are claimed).
 */
export function buildRestaurantJsonLd(
  restaurant: Restaurant,
  siteUrl: string,
): Record<string, unknown> | null {
  const url = buildCanonicalUrl(siteUrl, '/')
  const hours = buildOpeningHoursSpecification(restaurant)
  const cuisine = deriveServesCuisine(restaurant)

  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    image: DEFAULT_OG_IMAGE,
    telephone: restaurant.phone,
    url: url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: restaurant.address,
      addressLocality: restaurant.city,
      addressCountry: restaurant.country,
    },
  }

  if (restaurant.tagline) node['description'] = restaurant.tagline
  if (restaurant.email) node['email'] = restaurant.email
  if (cuisine) node['servesCuisine'] = cuisine
  if (hours.length > 0) node['openingHoursSpecification'] = hours

  return node
}
