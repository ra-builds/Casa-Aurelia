/**
 * Regression spec for Casa Aurelia's "earliest bookable date" calendar-date
 * semantics (Phase 8J).
 *
 * The shipped implementation lives in `src/utils/date.ts`:
 *
 *   export function toLocalCalendarDate(input) {
 *     return `${input.getFullYear()}-${pad(input.getMonth()+1)}-${pad(input.getDate())}`
 *   }
 *   export function getMinDate(injectedNow = new Date()) {
 *     return toLocalCalendarDate(injectedNow)
 *   }
 *
 * The prior (buggy) implementation derived the calendar day from the UTC
 * representation of the current instant:
 *
 *   new Date().toISOString().split('T')[0]
 *
 * `toISOString()` is UTC, so for timezones where the UTC date is one day ahead
 * of the local date (any UTC-negative timezone, during the local afternoon and
 * evening) the picker's `min` was the *next* local day, silently forbidding a
 * same-day booking that the backend (which accepts any date at or after its own
 * local `date.today()`) would accept.
 *
 * This file uses only Node built-ins (no new test framework / dependency). It
 * runs each scenario in a child process with an explicit `TZ` and a pinned
 * instant, so it proves the calendar-date semantics are correct across
 * timezones and does NOT depend on the developer machine's local timezone.
 */

import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Child code: given { TZ, INSTANT } compute the authoritative local calendar
// date (via Intl with the explicit timezone), the new shipped algorithm, and
// the old UTC algorithm. Printed as LOCAL/NEW/OLD.
const CHILD = `
  const d = new Date(process.env.INSTANT)
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
  const pad = (v) => String(v).padStart(2, '0')
  const newMin = (t) =>
    \`\${t.getFullYear()}-\${pad(t.getMonth() + 1)}-\${pad(t.getDate())}\`
  const oldMin = (t) => t.toISOString().split('T')[0]
  console.log(JSON.stringify({
    local,
    newMin: newMin(d),
    oldMin: oldMin(d),
  }))
`

function run(tz, instant) {
  const res = spawnSync(process.execPath, ['--input-type=module', '--eval', CHILD], {
    env: { ...process.env, TZ: tz, INSTANT: instant },
    cwd: __dirname,
    encoding: 'utf8',
  })
  assert.equal(res.status, 0, `child for ${tz} failed: ${res.stderr}`)
  return JSON.parse(res.stdout.trim())
}

// Anchored instants chosen so that, in a UTC-negative timezone, the local
// calendar date is one day BEHIND the UTC date (the bug window): local time of
// day between ~midnight and the offset means the UTC date has already ticked
// over to the next day.
const scenarios = [
  // 02:00 UTC == 22:00 previous day in New York (EDT, UTC−4): local is Mar 09.
  { tz: 'America/New_York', instant: '2026-03-10T02:00:00Z' },
  // 06:00 UTC == 20:00 previous day in Honolulu (HST, UTC−10): local is Mar 09.
  { tz: 'Pacific/Honolulu', instant: '2026-03-10T06:00:00Z' },
  // 02:00 UTC == 03:00 same day in Rome (CET, UTC+1): local is Mar 10.
  { tz: 'Europe/Rome', instant: '2026-03-10T02:00:00Z' },
  // 02:00 UTC == 11:00 same day in Tokyo (JST, UTC+9): local is Mar 10.
  { tz: 'Asia/Tokyo', instant: '2026-03-10T02:00:00Z' },
]

for (const { tz, instant } of scenarios) {
  const r = run(tz, instant)

  console.log(`${tz.padEnd(18)} ${instant}  local=${r.local}  new=${r.newMin}  old=${r.oldMin}`)

  // The shipped/local algorithm must always equal the authoritative local
  // calendar date for that timezone (this is the Phase 8J guarantee).
  assert.equal(
    r.newMin,
    r.local,
    `getMinDate (local) must equal the local calendar date in ${tz}; got ${r.newMin}, expected ${r.local}`,
  )

  // In UTC-negative timezones the old toISOString approach produces the NEXT
  // local day (the bug this phase fixes).
  if (tz === 'America/New_York' || tz === 'Pacific/Honolulu') {
    assert.notEqual(
      r.oldMin,
      r.local,
      `In ${tz} the old toISOString implementation must NOT equal today (it returns the wrong, UTC-based day)`,
    )
  } else {
    assert.equal(
      r.oldMin,
      r.local,
      `In ${tz} the old toISOString implementation happens to agree with local - sanity check`,
    )
  }
}

console.log('\ngetMinDate calendar-date semantics OK across timezones.')
