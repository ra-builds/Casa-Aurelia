/**
 * SEO regression guards (Original Phase 14).
 *
 * The shipped SEO layer lives in `src/utils/seo.ts` (pure, data-driven) and
 * `src/hooks/usePageTitle.ts` (`usePageSeo`). This spec:
 *
 *   1. Mirrors the pure helpers and asserts their behaviour with the real
 *      restaurant seed data (BUSINESS DATA -> structured metadata).
 *   2. Reads the source / static assets to assert source-level SEO contracts:
 *      canonical without query params, noindex for private pages, sitemap /
 *      robots excluding private routes, and a JSON-LD field WHITELIST that
 *      never emits invented data (no ratings, no prices, no `sameAs` from
 *      unverified seed URLs).
 *
 * Uses only Node built-ins (no framework / dependency), consistent with the
 * existing specs. Honest limitation: this verifies the source contract, not
 * browser rendering / crawled output.
 */

import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const readSrc = (rel) => readFileSync(join(SRC, rel), 'utf8')

let passed = 0
function ok(cond, msg) {
  assert.ok(cond, msg)
  passed++
  console.log(`  ok - ${msg}`)
}

// ---------------------------------------------------------------------------
// 1. Pure helper mirrors (contract with src/utils/seo.ts)
// ---------------------------------------------------------------------------

const OG_LOCALE = { en: 'en_GB', it: 'it_IT', fr: 'fr_FR', de: 'de_DE', es: 'es_ES' }
const getOgLocale = (lang) => OG_LOCALE[lang] ?? 'en_GB'

function buildCanonicalUrl(origin, path) {
  const base = origin ? origin.replace(/\/+$/, '') : ''
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (!base) return cleanPath
  return `${base}${cleanPath === '/' ? '' : cleanPath}`
}

function padTime(value) {
  const m = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return value
  return `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`
}

function parseHoursRange(raw) {
  if (!raw) return null
  const match = raw.match(/(\d{1,2}:\d{2})\s*[\u2013\u2014-]\s*(\d{1,2}:\d{2})/)
  if (!match) return null
  return { opens: padTime(match[1]), closes: padTime(match[2]) }
}

const DAY_NAME_TO_ISO = {
  Monday: 'Mo', Tuesday: 'Tu', Wednesday: 'We', Thursday: 'Th',
  Friday: 'Fr', Saturday: 'Sa', Sunday: 'Su',
}
const WEEKDAYS_ISO = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function buildOpeningHoursSpecification(restaurant) {
  const closedIso = DAY_NAME_TO_ISO[restaurant.closed_day ?? '']
  const lunch = parseHoursRange(restaurant.lunch_hours ?? '')
  const dinner = parseHoursRange(restaurant.dinner_hours ?? '')
  if (!closedIso || !lunch || !dinner) return []
  const openDays = WEEKDAYS_ISO.filter((day) => day !== closedIso)
  const specs = []
  for (const day of openDays) {
    specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: [day], opens: lunch.opens, closes: lunch.closes })
    specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: [day], opens: dinner.opens, closes: dinner.closes })
  }
  return specs
}

function deriveServesCuisine(restaurant) {
  const text = `${restaurant.tagline ?? ''} ${restaurant.tagline ?? ''}`.toLowerCase()
  if (text.includes('italian')) return ['Italian']
  return null
}

function buildRestaurantJsonLd(restaurant, siteUrl) {
  const url = buildCanonicalUrl(siteUrl, '/')
  const hours = buildOpeningHoursSpecification(restaurant)
  const cuisine = deriveServesCuisine(restaurant)
  const node = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    telephone: restaurant.phone,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: restaurant.address,
      addressLocality: restaurant.city,
      addressCountry: restaurant.country,
    },
  }
  if (restaurant.tagline) node.description = restaurant.tagline
  if (restaurant.email) node.email = restaurant.email
  if (cuisine) node.servesCuisine = cuisine
  if (hours.length > 0) node.openingHoursSpecification = hours
  return node
}

// Real seed business data (Schema object shape mirrors src/backend seed).
const RESTAURANT = {
  name: 'Casa Aurelia',
  tagline: 'Modern Italian cuisine in the heart of Novara',
  address: 'Via Roma 42, 28100 Novara, Italy',
  city: 'Novara',
  country: 'Italy',
  phone: '+39 0321 123 456',
  email: 'info@casaaurelia.it',
  lunch_hours: '12:00 – 14:00',
  dinner_hours: '19:00 – 22:00',
  closed_day: 'Monday',
}

console.log('\n1. Pure helpers -> truthful structured metadata')
ok(getOgLocale('it') === 'it_IT', 'og:locale maps it -> it_IT')
ok(getOgLocale('xx') === 'en_GB', 'unknown lang falls back to en_GB')
ok(buildCanonicalUrl('https://casaaurelia.example', '/menu') === 'https://casaaurelia.example/menu', 'canonical joins origin+path')
ok(buildCanonicalUrl('https://casaaurelia.example', '/') === 'https://casaaurelia.example', 'canonical home omits trailing slash')
ok(buildCanonicalUrl('https://casaaurelia.example/', '/about') === 'https://casaaurelia.example/about', 'canonical tolerates origin trailing slash')
ok(buildCanonicalUrl('', '/menu') === '/menu', 'no origin -> path-only (no invented domain)')
ok(parseHoursRange('12:00 – 14:00').opens === '12:00', 'parses en-dash range opens')
ok(parseHoursRange('12:00 – 14:00').closes === '14:00', 'parses en-dash range closes')
ok(parseHoursRange('8:00-16:00').opens === '08:00', 'pads single-digit hour')
ok(parseHoursRange('') === null, 'empty range -> null (omit, don\'t guess)')

const hours = buildOpeningHoursSpecification(RESTAURANT)
ok(hours.length === 12, `openingHoursSpecification derives 2 periods x 6 open days (got ${hours.length})`)
ok(hours.every((h) => h.dayOfWeek[0] !== 'Mo'), 'Monday (closed_day) is excluded')
ok(hours.some((h) => h.dayOfWeek[0] === 'Tu' && h.opens === '12:00'), 'Tue lunch present')
ok(hours.every((h) => h.opens && h.closes), 'every period has opens & closes')
ok(buildOpeningHoursSpecification({ closed_day: 'Noday', lunch_hours: '12:00 – 14:00', dinner_hours: '19:00 – 22:00' }).length === 0, 'unknown closed_day -> omit hours')

const cuisine = deriveServesCuisine(RESTAURANT)
assert.deepEqual(cuisine, ['Italian'], 'servesCuisine derived from tagline')
ok(deriveServesCuisine({ tagline: null }) === null, 'no cuisine claim when not determinable')

const jsonLd = buildRestaurantJsonLd(RESTAURANT, 'https://casaaurelia.example')
assert.equal(jsonLd['@type'], 'Restaurant', 'JSON-LD @type is Restaurant')
assert.equal(jsonLd.name, 'Casa Aurelia', 'name from data')
assert.equal(jsonLd.email, 'info@casaaurelia.it', 'email from data')
assert.equal(jsonLd.telephone, '+39 0321 123 456', 'telephone from data')
assert.equal(jsonLd.address.streetAddress, 'Via Roma 42, 28100 Novara, Italy', 'streetAddress is the stored address')
assert.equal(jsonLd.address.addressLocality, 'Novara', 'addressLocality = city')
assert.equal(jsonLd.address.addressCountry, 'Italy', 'addressCountry = country')
ok(jsonLd.url === 'https://casaaurelia.example', 'JSON-LD url is canonical home')
ok(Array.isArray(jsonLd.openingHoursSpecification) && jsonLd.openingHoursSpecification.length === 12, 'JSON-LD includes derived hours')

// WHITELIST: no invented data / unverified fields.
const WHITELISTED_KEYS = ['@context', '@type', 'name', 'image', 'telephone', 'url', 'address', 'description', 'email', 'servesCuisine', 'openingHoursSpecification']
for (const key of Object.keys(jsonLd)) {
  ok(WHITELISTED_KEYS.includes(key), `JSON-LD key "${key}" is whitelisted`)
}
ok(!('sameAs' in jsonLd), 'sameAs NOT emitted (seed social URLs not externally verified)')
ok(!('priceRange' in jsonLd), 'priceRange NOT emitted (no price claims)')
ok(!('aggregateRating' in jsonLd), 'no aggregateRating emitted')
ok(!('review' in jsonLd), 'no review emitted')

// ---------------------------------------------------------------------------
// 2. Source-level contracts: canonical / noindex / sitemap / robots
// ---------------------------------------------------------------------------

console.log('\n2. Source-level SEO contracts')
const usePageTitle = readSrc('hooks/usePageTitle.ts')
const app = readSrc('App.tsx')
const structuredData = readSrc('components/seo/StructuredData.tsx')

// Canonical never contains query params (the hook uses a pathname-only builder).
ok(usePageTitle.includes('buildCanonicalUrl(SITE_URL, path ?? pathname)'), 'useCanonical uses path only (no query params)')
ok(usePageTitle.includes('noindex, nofollow'), 'noindex directive defined in metadata hook')

// Indexable public pages must use usePageSeo and NOT set noindex.
const INDEXABLE_PAGES = ['HomePage', 'MenuPage', 'SignaturesPage', 'AboutPage', 'GalleryPage', 'ReservationsPage', 'ContactPage']
for (const page of INDEXABLE_PAGES) {
  const src = readSrc(`pages/${page}.tsx`)
  ok(src.includes('usePageSeo('), `${page} uses usePageSeo`)
  ok(!/noindex/.test(src), `${page} is indexable (no noindex)`)
}

// Private / transactional pages must set noindex.
const NOINDEX_PAGES = ['AdminPage', 'ConfirmationPage', 'ReservationLookupPage', 'NotFoundPage']
for (const page of NOINDEX_PAGES) {
  const src = readSrc(`pages/${page}.tsx`)
  ok(/noindex:\s*true/.test(src), `${page} sets noindex: true`)
}

// Structured data injection is present and data-driven.
ok(app.includes('<StructuredData />'), 'StructuredData mounted in App')
ok(structuredData.includes('buildRestaurantJsonLd'), 'StructuredData uses buildRestaurantJsonLd')

// ---------------------------------------------------------------------------
// 3. robots.txt / sitemap content contracts
// ---------------------------------------------------------------------------

console.log('\n3. robots.txt & sitemap source assets')
ok(existsSync(join(ROOT, 'scripts/generate-seo.mjs')), 'SEO generator script exists')
const gen = read('scripts/generate-seo.mjs')
for (const p of ['/admin', '/reservation-lookup', '/reservation-confirmed']) {
  ok(gen.includes(`Disallow: ${p}`) || gen.includes(`'${p}'`), `generator handles private path ${p}`)
}
for (const r of ['/menu', '/signatures', '/about', '/gallery', '/reservations', '/contact']) {
  ok(gen.includes(`{ path: '${r}'`), `generator sitemap includes ${r}`)
}
const indexableBlock = gen.slice(gen.indexOf('const INDEXABLE_ROUTES'), gen.indexOf('const PRIVATE_PATHS'))
for (const p of ['/admin', '/reservation-lookup', '/reservation-confirmed']) {
  ok(!indexableBlock.includes(`'${p}'`), `private path ${p} is NOT in indexable sitemap routes`)
}

// ---------------------------------------------------------------------------
// 4. index.html static head has OG/Twitter defaults
// ---------------------------------------------------------------------------

console.log('\n4. index.html static fallback head')
const html = read('index.html')
for (const tag of ['og:image', 'og:site_name', 'og:locale', 'twitter:card', 'twitter:title']) {
  ok(html.includes(tag), `index.html has ${tag}`)
}
ok(html.includes('theme-color'), 'index.html has theme-color')

console.log(`\nSEO spec: ${passed} assertions passed`)
