/**
 * Restaurant Template boundary regression guards (Original Phase 18).
 *
 * Phase 18 makes the reusable-architecture vs. restaurant-specific-content
 * boundary EXPLICIT so a client delivery can be produced without rewriting the
 * shared UI. This spec guards that boundary:
 *
 *   1. STATIC BRAND CONFIG — `src/config/site.ts` is the single source for the
 *      static brand identity, now including the Phase 18 fields
 *      (businessTypeLabel, defaultCurrency, referenceCodePrefix).
 *   2. NO HARD-CODED BRAND IN UI — page/shared components must not fall back to
 *      a hard-coded `'Casa Aurelia'` literal; they render the live restaurant
 *      name from context, falling back to SITE_CONFIG.brandName.
 *   3. BUSINESS-TYPE LABEL — layout chrome (Navbar/Footer) renders the label
 *      from SITE_CONFIG.businessTypeLabel, not a literal "Ristorante".
 *   4. CURRENCY DEFAULT — the public formatPrice helper defaults through
 *      SITE_CONFIG.defaultCurrency (no hard-coded 'EUR' literal in the default).
 *   5. CALENDAR LINK — generateCalendarLink no longer embeds a hard-coded
 *      restaurant address fallback.
 *   6. PLACEHOLDER CONTENT — the reservation phone placeholder is localized
 *      text (i18n), not a hard-coded phone number.
 *   7. I18N PARITY — the new key lives in all five locales (same leaf count).
 *
 * Uses only Node built-ins, consistent with the existing specs. Verifies source
 * contracts, not browser pixels.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src')
const readSrc = (rel) => readFileSync(join(SRC, rel), 'utf8')

let passed = 0
function ok(cond, msg) {
  assert.ok(cond, msg)
  passed++
  console.log(`  ok - ${msg}`)
}

// ---------------------------------------------------------------------------
// 1. Static brand config exposes the Phase 18 template fields
// ---------------------------------------------------------------------------

console.log('\n1. Static brand config exposes the Phase 18 fields')
const config = readSrc('config/site.ts')
ok(/businessTypeLabel/.test(config), 'config defines businessTypeLabel')
ok(/defaultCurrency/.test(config), 'config defines defaultCurrency')
ok(/referenceCodePrefix/.test(config), 'config defines referenceCodePrefix')
ok(/businessTypeLabel:\s*['"]Ristorante['"]/.test(config), 'businessTypeLabel has a concrete starter value')
ok(/defaultCurrency:\s*['"]EUR['"]/.test(config), 'defaultCurrency defaults to EUR for this template')
ok(/referenceCodePrefix:\s*['"]CASA['"]/.test(config), 'referenceCodePrefix defaults to CASA for this template')

// ---------------------------------------------------------------------------
// 2. No hard-coded brand literal in page/shared components
// ---------------------------------------------------------------------------

console.log('\n2. Page/shared components render brand via context + config (no literal)')
const uiFiles = [
  'pages/AboutPage.tsx',
  'pages/ContactPage.tsx',
  'pages/ConfirmationPage.tsx',
  'pages/GalleryPage.tsx',
  'pages/MenuPage.tsx',
  'pages/SignaturesPage.tsx',
  'pages/NotFoundPage.tsx',
  'components/layout/Navbar.tsx',
  'components/layout/Footer.tsx',
  'components/home/HeroSection.tsx',
]
for (const rel of uiFiles) {
  const src = readSrc(rel)
  ok(!/['"]Casa Aurelia['"]/.test(src), `${rel} has no hard-coded 'Casa Aurelia' literal`)
}
for (const rel of [
  'pages/AboutPage.tsx',
  'pages/ContactPage.tsx',
  'pages/ConfirmationPage.tsx',
  'pages/GalleryPage.tsx',
  'pages/MenuPage.tsx',
  'pages/SignaturesPage.tsx',
  'pages/NotFoundPage.tsx',
]) {
  const src = readSrc(rel)
  ok(/SITE_CONFIG\.brandName/.test(src), `${rel} falls back to SITE_CONFIG.brandName`)
}

// ---------------------------------------------------------------------------
// 3. Layout chrome business-type label comes from config
// ---------------------------------------------------------------------------

console.log('\n3. Navbar/Footer use the configured business-type label')
for (const rel of ['components/layout/Navbar.tsx', 'components/layout/Footer.tsx']) {
  const src = readSrc(rel)
  ok(/SITE_CONFIG\.businessTypeLabel/.test(src), `${rel} renders businessTypeLabel from config`)
  ok(!/['"]Ristorante['"]/.test(src), `${rel} does not hard-code 'Ristorante'`)
}

// ---------------------------------------------------------------------------
// 4. formatPrice defaults through the config currency
// ---------------------------------------------------------------------------

console.log('\n4. formatPrice defaults through SITE_CONFIG.defaultCurrency')
const helpers = readSrc('utils/helpers.ts')
ok(/currency:\s*string\s*=\s*SITE_CONFIG\.defaultCurrency/.test(helpers), 'formatPrice default is SITE_CONFIG.defaultCurrency')
ok(/import\s*\{[^}]*SITE_CONFIG[^}]*\}\s*from\s*'\.\.\/config\/site'/.test(helpers), 'helpers.ts imports SITE_CONFIG')

// ---------------------------------------------------------------------------
// 5. Calendar link has no hard-coded address fallback
// ---------------------------------------------------------------------------

console.log('\n5. generateCalendarLink has no hard-coded address fallback')
ok(/location:\s*location\s*\|\|\s*''/.test(helpers), 'calendar link location falls back to an empty string')
ok(!/Via Roma 42/.test(helpers), 'helpers.ts no longer embeds a hard-coded address')

// ---------------------------------------------------------------------------
// 6. Reservation phone placeholder is localized, not a hard-coded phone
// ---------------------------------------------------------------------------

console.log('\n6. Reservation phone placeholder is localized text')
const reservations = readSrc('pages/ReservationsPage.tsx')
ok(/placeholder=\{t\('reservation\.phonePlaceholder'\)\}/.test(reservations), 'phone placeholder uses the i18n key')
ok(!/placeholder=\s*["']\+\d/.test(reservations), 'no hard-coded phone-number placeholder remains')

// ---------------------------------------------------------------------------
// 7. I18N parity — new key present in all five locales with equal leaf count
// ---------------------------------------------------------------------------

console.log('\n7. New i18n key exists in all five locales (parity preserved)')
const LOCALE_FILES = ['en', 'it', 'fr', 'de', 'es']
const counts = {}
for (const lang of LOCALE_FILES) {
  const raw = readSrc(`i18n/translations/${lang}.json`)
  const json = JSON.parse(raw)
  assert.ok(json.reservation?.phonePlaceholder, `${lang}.json has reservation.phonePlaceholder`)
  let count = 0
  const walk = (node) => {
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) walk(value)
      else count++
    }
  }
  walk(json)
  counts[lang] = count
  console.log(`  ${lang}.json leaf keys = ${count}`)
}
const unique = new Set(Object.values(counts))
ok(unique.size === 1, 'all five locales expose the same leaf-key count')

console.log(`\nRestaurant Template boundary spec: ${passed} assertions passed`)
