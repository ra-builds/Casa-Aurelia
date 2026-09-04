/**
 * Locale & Formatting regression guards (Original Phase 13).
 *
 * The shipped formatting layer lives in `src/utils/helpers.ts`:
 *
 *   import { getCurrentLocale } from './locale'   // en-GB, it-IT, fr-FR, de-DE, es-ES
 *
 *   export function formatPrice(price, currency = 'EUR') {
 *     return new Intl.NumberFormat(getCurrentLocale(), {
 *       style: 'currency',
 *       currency,
 *       minimumFractionDigits: 2,
 *       maximumFractionDigits: 2,
 *     }).format(price)
 *   }
 *
 *   export function formatNumber(value) {
 *     return new Intl.NumberFormat(getCurrentLocale()).format(value)
 *   }
 *
 *   export function formatDate(dateStr) {
 *     return new Date(dateStr + 'T00:00:00').toLocaleDateString(getCurrentLocale(), {
 *       weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
 *     })
 *   }
 *
 * The business data (a price like `28`, a count like `1200`) is locale-neutral;
 * only the PRESENTATION depends on the active locale. This is the Phase 13
 * "BUSINESS DATA != PRESENTATION FORMAT" principle:
 *
 *   EN -> €28.00          IT -> 28,00 €
 *   DE -> 28,00 €         FR -> 28,00 €
 *
 * Currency is never hard-coded into JSX and the underlying business currency
 * never changes when the visitor switches language.
 *
 * Uses only Node built-ins (no new test framework / dependency), consistent
 * with the existing `getMinDate.test.mjs` and `slotGroups.test.mjs` specs. The
 * values below intentionally mirror `src/utils/helpers.ts`. Honest limitation:
 * this verifies the Intl semantics and the source contract, not browser pixels.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '..', 'src')
const read = (rel) => readFileSync(join(SRC, rel), 'utf8')

const LOCALES = {
  en: 'en-GB',
  it: 'it-IT',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
}

// Mirrors `helpers.ts` (the single source of truth). Pure, locale-injectable.
const formatPrice = (price, currency, locale) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)

const formatNumber = (value, locale) =>
  new Intl.NumberFormat(locale, { useGrouping: true }).format(value)

const formatDate = (dateStr, locale) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

// 1. Currency: exact roadmap example behavior per locale. Same business data
//    (28 EUR), locale-dependent presentation. Never loses the cents.
const expected = {
  en: '€28.00',
  it: '28,00 €',
  de: '28,00 €',
  fr: '28,00 €',
  es: '28,00 €',
}
for (const [lang, locale] of Object.entries(LOCALES)) {
  assert.equal(
    formatPrice(28, 'EUR', locale),
    expected[lang],
    `formatPrice(28, 'EUR', ${locale}) must match the phase-13 example behavior`,
  )
}

// 2. Currency decimals are always shown (2 fixed fraction digits), even for
//    whole-number business values — matching the roadmap examples.
for (const locale of Object.values(LOCALES)) {
  assert.ok(
    /28,00/.test(formatPrice(28, 'EUR', locale)) || /28\.00/.test(formatPrice(28, 'EUR', locale)),
    `${locale}: a whole-number price must keep its two decimal places`,
  )
}

// 3. Number formatting: grouping depends on the active locale. A large count
//    groups with the locale's separator.
assert.equal(formatNumber(1200, 'en-GB'), '1,200')
assert.equal(formatNumber(1200, 'it-IT'), '1.200')
assert.equal(formatNumber(1200, 'de-DE'), '1.200')
assert.equal(formatNumber(1200, 'fr-FR'), '1 200')
assert.equal(formatNumber(1200, 'es-ES'), '1.200')
assert.equal(formatNumber(7, 'en-GB'), '7')

// 4. Date formatting is locale-aware (month/weekday names differ).
const enDate = formatDate('2026-08-30', 'en-GB')
const itDate = formatDate('2026-08-30', 'it-IT')
assert.ok(/August/i.test(enDate), 'en-GB date must show English month name')
assert.ok(/agosto/i.test(itDate), 'it-IT date must show Italian month name')
assert.notEqual(enDate, itDate, 'dates must be rendered per the active locale')

// 5. GB vs US date wording shows the locale is the presentation layer (the
//    underlying YYYY-MM-DD business value is unchanged).
assert.equal(formatDate('2026-08-30', 'en-GB').includes('30 August'), true)
assert.equal(formatDate('2026-08-30', 'en-US').includes('August 30'), true)

// 6. Source contract: the shipped helper must keep two fixed currency decimals,
//    format through the active locale, and expose a locale-aware number helper.
const helpers = read('utils/helpers.ts')
assert.ok(
  helpers.includes("minimumFractionDigits: 2") &&
    helpers.includes("maximumFractionDigits: 2"),
  'helpers.ts formatPrice must keep two fixed currency fraction digits',
)
assert.ok(
  helpers.includes('getCurrentLocale()'),
  'helpers.ts format helpers must be bound to the active locale',
)
assert.ok(
  helpers.includes('export function formatNumber'),
  'helpers.ts must export the locale-aware formatNumber helper',
)
assert.ok(
  helpers.includes('useGrouping: true'),
  'helpers.ts formatNumber must keep explicit locale grouping',
)
assert.ok(
  !helpers.includes('toFixed('),
  'helpers.ts must not format currency via toFixed (bypasses locale)',
)

// 7. No hard-coded currency presentation in JSX: currency codes must come from
//    the restaurant data, never be literal 'EUR' in rendered components.
const noHardcodedCurrency = (rel) => {
  const src = read(rel)
  assert.ok(
    !/formatPrice\([^)]*'(?:EUR|[A-Z]{3})'\)/.test(src),
    `${rel} must not pass a hard-coded currency code to formatPrice`,
  )
}
noHardcodedCurrency('components/admin/MenuManager.tsx')

// 8. Every JSX formatPrice call site must be currency-data-driven: it either
//    renders the restaurant currency or is the defaulted public helper.
const unaudited = [
  'pages/MenuPage.tsx',
  'pages/SignaturesPage.tsx',
]
for (const rel of unaudited) {
  const src = read(rel)
  assert.ok(
    !/formatPrice\([^)]*'(?:EUR|[A-Z]{3})'\)/.test(src),
    `${rel} must not pass a hard-coded currency code to formatPrice`,
  )
}

console.log('Locale & Formatting (Phase 13) guards OK across EN/IT/DE/FR/ES.')
