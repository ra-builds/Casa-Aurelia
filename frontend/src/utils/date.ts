/**
 * Timezone-safe calendar-date helpers.
 *
 * A reservation date is a *calendar date* (YYYY-MM-DD) with no time component
 * and no timezone. The backend treats it as such: the API schema validates
 * `reservation_date` as a plain `date` and rejects any value before the
 * server's local calendar "today" (`date.today()`).
 *
 * JavaScript `Date` objects, however, are *instants*. Deriving a calendar date
 * from an instant via `toISOString()` returns the UTC calendar date, which can
 * differ from the local calendar date in timezones where the UTC date is a day
 * ahead of / behind the local date. All helpers here therefore derive calendar
 * dates from the **local** date components of an instant, so the frontend's
 * "earliest bookable date" and weekday parsing agree with the backend's
 * calendar-date semantics regardless of the user's timezone.
 */

/** Format a `YYYY-MM-DD` year-month-day with zero-padding. */
function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Return the local calendar date of `input` as `YYYY-MM-DD`.
 *
 * Uses the local `getFullYear/getMonth/getDate` components (never
 * `toISOString`, which is UTC) so the result is the calendar date as seen by
 * the viewer's own timezone.
 */
export function toLocalCalendarDate(input: Date): string {
  return `${input.getFullYear()}-${pad(input.getMonth() + 1)}-${pad(input.getDate())}`
}

/**
 * Earliest selectable reservation date (today, per the viewer's local calendar
 * day), as `YYYY-MM-DD`.
 *
 * This intentionally matches the backend boundary, which accepts any
 * reservation date at or after its own local calendar "today"
 * (`ReservationCreate.validate_date_not_past`). `injectedNow` exists so tests
 * can pin an exact instant (not relying on the machine's wall clock).
 */
export function getMinDate(injectedNow: Date = new Date()): string {
  return toLocalCalendarDate(injectedNow)
}

/**
 * Weekday (0=Sunday..6=Saturday) of a `YYYY-MM-DD` calendar date, interpreted
 * as local midnight so the weekday reflects the viewer's own calendar day.
 */
export function getWeekdayFromDateOnly(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getDay()
}
