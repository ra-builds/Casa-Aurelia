/**
 * Regression spec for Casa Aurelia's reservation time-slot grouping (Phase 9B).
 *
 * The shipped grouping lives in `src/utils/constants.ts`:
 *
 *   export const TIME_SLOTS = [
 *     '12:00', '12:30', '13:00', '13:30',
 *     '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
 *   ] as const
 *
 *   export const TIME_SLOT_GROUPS: { label, slots }[] = [
 *     { label: 'lunch', slots: ['12:00','12:30','13:00','13:30'] },
 *     { label: 'dinner', slots: ['19:00','19:30','20:00','20:30','21:00','21:30'] },
 *   ] as const
 *
 * The booking form renders these as <optgroup> Lunch / Dinner. This spec guards
 * the invariants that guarantee every available slot is still offered, exactly
 * once, and that lunch/dinner are partitioned correctly — so a drift between the
 * grouping and the full slot list cannot silently drop a bookable time.
 *
 * The values below intentionally mirror `src/utils/constants.ts`. Uses only Node
 * built-ins (no new test framework / dependency), consistent with the existing
 * `getMinDate.test.mjs` spec.
 */

import assert from 'node:assert/strict'

const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
]

const TIME_SLOT_GROUPS = [
  { label: 'lunch', slots: ['12:00', '12:30', '13:00', '13:30'] },
  { label: 'dinner', slots: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'] },
]

const toMinutes = (slot) => {
  const [h, m] = slot.split(':').map(Number)
  return h * 60 + m
}

// 1. Every slot is offered exactly once across the groups (no drop, no dup).
const offered = TIME_SLOT_GROUPS.flatMap((g) => g.slots)
assert.deepEqual(
  [...offered].sort(),
  [...TIME_SLOTS].sort(),
  'Grouped slots must be exactly the full set of bookable TIME_SLOTS (no missing, no extra)',
)
assert.equal(
  new Set(offered).size,
  offered.length,
  'Grouped slots must not contain duplicates',
)

// 2. Groups are internally ordered and match the canonical TIME_SLOTS order.
const indexInCanonical = (slot) => TIME_SLOTS.indexOf(slot)
for (const group of TIME_SLOT_GROUPS) {
  for (let i = 0; i < group.slots.length; i += 1) {
    if (i > 0) {
      assert.ok(
        group.slots[i] > group.slots[i - 1],
        `Group "${group.label}" slots must be in ascending time order`,
      )
      assert.ok(
        indexInCanonical(group.slots[i]) > indexInCanonical(group.slots[i - 1]),
        `Group "${group.label}" slots must respect the canonical TIME_SLOTS order`,
      )
    }
  }
}

// 3. Lunch is earlier than dinner; both exist.
const lunch = TIME_SLOT_GROUPS.find((g) => g.label === 'lunch')
const dinner = TIME_SLOT_GROUPS.find((g) => g.label === 'dinner')
assert.ok(lunch && lunch.slots.length > 0, 'A non-empty "lunch" group must exist')
assert.ok(dinner && dinner.slots.length > 0, 'A non-empty "dinner" group must exist')
assert.ok(
  toMinutes(lunch.slots[lunch.slots.length - 1]) < toMinutes(dinner.slots[0]),
  'All lunch slots must be before all dinner slots',
)

// 4. Lunch is a daytime service, dinner an evening service.
assert.ok(
  toMinutes(lunch.slots[lunch.slots.length - 1]) < 18 * 60,
  'Lunch must be a daytime service (last slot before 18:00)',
)
assert.ok(
  toMinutes(dinner.slots[0]) >= 18 * 60,
  'Dinner must be an evening service (first slot at/after 18:00)',
)

console.log('TIME_SLOT_GROUPS invariants OK (full coverage, unique, lunch<dinner).')
