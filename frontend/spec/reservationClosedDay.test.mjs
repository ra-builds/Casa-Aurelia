/**
 * Regression spec for Casa Aurelia's reservation closed-day weekday mapping
 * (QA-4.1).
 *
 * The shipped comparison lives in `src/pages/ReservationsPage.tsx`:
 *
 *   const WEEKDAY_INDEX: Record<string, number> = {
 *     monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
 *     friday: 5, saturday: 6, sunday: 0,
 *   }
 *
 *   function isClosedDay(dateStr, closedDay) {
 *     const idx = WEEKDAY_INDEX[closedDay.trim().toLowerCase()]
 *     if (idx === undefined) return false
 *     return getWeekdayFromDateOnly(dateStr) === idx
 *   }
 *
 * `getWeekdayFromDateOnly` (src/utils/date.ts) returns JavaScript
 * `Date.getDay()` (0=Sunday..6=Saturday). The previous buggy mapping used
 * `monday: 0 … sunday: 6`, so every closed-day comparison was shifted by one:
 * Sundays were flagged as the closed day and Mondays never were. This spec
 * reads the ACTUAL shipped constant straight from the source file (no second
 * copy of the mapping to drift) and asserts it lines up with `Date.getDay()`
 * for real dates — binding Monday -> Monday and Sunday -> Sunday.
 *
 * Anchors: 2026-09-07 is a Monday (getDay 1), 2026-09-06 is a Sunday
 * (getDay 0). Both are sanity-checked before use so the test can never pass by
 * accident on a machine where those calendar facts are wrong.
 *
 * Uses only Node built-ins (no new test framework / dependency), consistent
 * with the existing frontend source-level specs.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(__dirname, '../src/pages/ReservationsPage.tsx'), 'utf8')

// --- Parse the shipped WEEKDAY_INDEX object literal out of the source. ---

const block = source.match(/WEEKDAY_INDEX\s*:\s*Record<string,\s*number>\s*=\s*\{([^}]*)\}/)
assert.ok(block, 'WEEKDAY_INDEX constant must exist in ReservationsPage.tsx')

const WEEKDAY_INDEX = {}
for (const [, key, value] of block[1].matchAll(/([a-z]+):\s*(\d+)/g)) {
  WEEKDAY_INDEX[key] = Number(value)
}

// --- Anchor sanity checks: these calendar facts must hold for the spec to mean anything. ---

const monday = new Date('2026-09-07T00:00:00') // Monday
const sunday = new Date('2026-09-06T00:00:00') // Sunday
assert.equal(monday.getDay(), 1, 'anchor sanity: 2026-09-07 must be a Monday (getDay 1)')
assert.equal(sunday.getDay(), 0, 'anchor sanity: 2026-09-06 must be a Sunday (getDay 0)')

// --- The exact regression this phase fixes. ---

assert.equal(
  WEEKDAY_INDEX.monday,
  monday.getDay(),
  'Monday must be indexed by a real Monday (Date.getDay() === 1), not 0 (the previous bug flagged Sundays instead)',
)
assert.equal(
  WEEKDAY_INDEX.sunday,
  sunday.getDay(),
  'Sunday must be indexed by a real Sunday (Date.getDay() === 0), not 6 (the previous bug mis-flagged Sundays as the closed day)',
)

// --- The whole week must align with Date.getDay() (0=Sunday..6=Saturday). ---

const JS_DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
for (let i = 0; i < 7; i += 1) {
  const probe = new Date(monday)
  probe.setDate(monday.getDate() + i)
  assert.equal(
    WEEKDAY_INDEX[JS_DAY_NAMES[probe.getDay()]],
    probe.getDay(),
    `"${JS_DAY_NAMES[probe.getDay()]}" must be indexed by Date.getDay() (${probe.getDay()})`,
  )
}

// --- Behavior-level bindings using the parsed mapping (Monday -> Monday, Sunday -> Sunday). ---

const getDay = (isoDate) => new Date(`${isoDate}T00:00:00`).getDay()
const isClosedDay = (isoDate, closedDay) => {
  const idx = WEEKDAY_INDEX[closedDay.trim().toLowerCase()]
  if (idx === undefined) return false
  return getDay(isoDate) === idx
}

assert.equal(isClosedDay('2026-09-07', 'monday'), true, 'a Monday must be recognized when the closed day is Monday')
assert.equal(isClosedDay('2026-09-06', 'monday'), false, 'a Sunday must NOT be recognized as the Monday closed day')
assert.equal(isClosedDay('2026-09-06', 'sunday'), true, 'a Sunday must be recognized when the closed day is Sunday')
assert.equal(
  isClosedDay('2026-09-08', 'tuesday'),
  true,
  'a Tuesday must be recognized when the closed day is Tuesday (no off-by-one drift)',
)

console.log('Reservation closed-day weekday mapping OK (Monday->Monday, Sunday->Sunday, full week aligned).')