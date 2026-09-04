/**
 * Production hardening regression guards (Original Phase 16).
 *
 * Phase 16 is a hardening/quality/security phase. These specs protect two
 * concrete, justified fixes:
 *
 *   1. INTERNAL NAVIGATION — the Menu page "Our signatures" link must use the
 *      client-side <Link> (react-router) rather than a plain <a href>, so
 *      navigating to /signatures stays a single-page navigation (preserving the
 *      Phase 15 route-level code-splitting benefit instead of forcing a full
 *      page reload).
 *   2. WEEKDAY LOCALIZATION — the restaurant's closed-day label must be
 *      resolved through the shared resolveDayKey helper (reusing the existing
 *      home.monday…home.sunday keys) wherever it is displayed, so a viewer in
 *      any supported locale sees the weekday in their own language rather than
 *      the raw English value from the restaurant data.
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

console.log('\n1. Internal navigation uses client-side router (SPA)')
const menu = readSrc('pages/MenuPage.tsx')
ok(
  menu.includes("from 'react-router-dom'") && /import\s*\{[^}]*\bLink\b/.test(menu),
  'MenuPage imports Link from react-router-dom',
)
ok(
  menu.includes('<Link\n                to="/signatures"') || /<Link[^>]*to="\/signatures"/.test(menu),
  'MenuPage signatures link uses <Link to="/signatures">',
)
ok(
  !/<a\b[^>]*href="\/signatures"/.test(menu),
  'MenuPage has no raw <a href="/signatures"> that would reload the page',
)

console.log('\n2. Weekday localization resolver (shared helper)')
const helpers = readSrc('utils/helpers.ts')
ok(
  /export function resolveDayKey\(/.test(helpers),
  'helpers.ts exports resolveDayKey',
)
ok(
  helpers.includes("monday: 'home.monday'") && helpers.includes("sunday: 'home.sunday'"),
  'resolveDayKey maps all weekdays to existing home.* keys',
)

console.log('\n3. Closed-day label is localized on display pages')
for (const [file, needle] of [
  ['components/layout/Footer.tsx', 'resolveDayKey'],
  ['pages/ContactPage.tsx', 'resolveDayKey'],
  ['pages/ReservationsPage.tsx', 'resolveDayKey'],
]) {
  const src = readSrc(file)
  ok(
    src.includes(needle),
    `${file} uses resolveDayKey for the closed-day label`,
  )
}
const reservations = readSrc('pages/ReservationsPage.tsx')
ok(
  /{closedDayLabel}\s*<\/dd>/.test(reservations),
  'ReservationsPage renders the localized closed-day label in the details block',
)

console.log(`\nProduction hardening spec: ${passed} assertions passed`)
