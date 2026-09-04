/**
 * Responsive / mobile-excellence regression guards (Phase 11N).
 *
 * This spec is a *source-level contract*, not a visual test. It asserts the
 * specific, deliberate responsive choices made in Phase 11 so a future edit
 * cannot silently regress them:
 *
 *   - The navbar's full inline nav is reserved for `xl` (1280px) and up so long
 *     translated labels (e.g. German "Reservierungen", Spanish "Sobre
 *     Nosotros") cannot crowd or overflow the 1024-1279px desktop band.
 *     Below `xl` the hamburger menu is used.
 *   - The confirmation page's action row wraps instead of forcing four buttons
 *     into one overflowing row inside the narrow `max-w-lg` card.
 *   - Contact social links can wrap on 320px viewports.
 *   - Admin pagination wraps instead of overflowing a 320px viewport.
 *   - Admin tables declare an intentional minimum width (scroll container) so
 *     their columns never crush to unusable widths on phones.
 *   - Key touch controls (hamburger, lightbox close, filter chips, admin row
 *     actions, pagination) keep comfortable touch targets.
 *   - The body never relies on `overflow-x-hidden` to hide layout overflow, and
 *     no stray fixed `min-w-[...]` classes appear outside the three admin
 *     tables.
 *
 * Uses only Node built-ins (`node:fs`, `node:assert/strict`), consistent with
 * the existing `getMinDate.test.mjs` and `slotGroups.test.mjs` specs. Honest
 * limitation: this verifies source structure, not pixel rendering.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '..', 'src')
const read = (rel) => readFileSync(join(SRC, rel), 'utf8')

const navbar = read('components/layout/Navbar.tsx')
const confirmation = read('pages/ConfirmationPage.tsx')
const contact = read('pages/ContactPage.tsx')
const admin = read('pages/AdminPage.tsx')
const categoryManager = read('components/admin/CategoryManager.tsx')
const menuManager = read('components/admin/MenuManager.tsx')
const gallery = read('pages/GalleryPage.tsx')
const menu = read('pages/MenuPage.tsx')

// 1. Navbar: inline nav only at xl (1280px+); hamburger visible below xl.
assert.ok(
  navbar.includes('hidden xl:flex') && !navbar.includes('hidden lg:flex'),
  'Navbar inline nav must be xl-only so long translated labels do not crowd 1024-1279px',
)
assert.equal(
  (navbar.match(/\bxl:hidden\b/g) ?? []).length,
  2,
  'Navbar must show the hamburger toggle and dropdown below xl',
)
assert.ok(
  navbar.includes('p-2.5') && navbar.includes('aria-expanded'),
  'Navbar hamburger must keep a comfortable touch target (p-2.5)',
)

// 2. Confirmation: action row wraps (four buttons must never share one row).
assert.ok(
  confirmation.includes('sm:flex-wrap'),
  'ConfirmationPage action row must wrap instead of overflowing the max-w-lg card',
)

// 3. Contact: social links wrap at 320px.
assert.ok(
  contact.includes('flex flex-wrap gap-x-6'),
  'ContactPage social links must wrap on narrow viewports',
)

// 4. Admin pagination wraps; reservations table has an intentional min width.
assert.ok(
  admin.includes('flex flex-wrap items-center justify-between gap-2 mt-4'),
  'AdminPage pagination must wrap on narrow viewports',
)
assert.ok(
  admin.includes('table className="w-full min-w-[680px] text-sm"'),
  'AdminPage reservations table must keep an intentional min-width scroll container',
)

// 5. Admin menu/category tables keep intentional min-width scroll containers.
assert.ok(
  categoryManager.includes('table className="w-full min-w-[560px] text-sm"'),
  'CategoryManager table must keep an intentional min-width scroll container',
)
assert.ok(
  menuManager.includes('table className="w-full min-w-[720px] text-sm"'),
  'MenuManager table must keep an intentional min-width scroll container',
)

// 6. Admin row actions keep a usable touch target (no p-1.5 icon buttons).
assert.ok(
  !/(className="[^"]*\bp-1\.5\b)/.test(admin + categoryManager + menuManager),
  'Admin row action icon buttons must not use the small p-1.5 touch target',
)

// 7. Gallery: lightbox close target bumped; filter chips have a taller target.
assert.ok(
  gallery.includes('focus-visible:ring-cream rounded-sm p-2'),
  'Gallery lightbox close button must keep a comfortable touch target (p-2)',
)
assert.ok(
  gallery.includes('px-5 py-2.5 text-sm uppercase'),
  'Gallery filter chips must keep a comfortable touch target (py-2.5)',
)
assert.ok(
  menu.includes('px-5 py-2.5 text-sm uppercase'),
  'Menu filter chips must keep a comfortable touch target (py-2.5)',
)

// 8. No body-level layout overflow hiding; only the three admin tables may
//    declare a pixel min-width.
const allSources = [
  navbar, confirmation, contact, admin,
  categoryManager, menuManager, gallery, menu,
]
for (const src of allSources) {
  assert.ok(
    !/\boverflow-x-hidden\b/.test(src),
    'Phase 11 must fix the actual layout problem, never hide overflow with overflow-x-hidden',
  )
}
const minWidths = (src) => [...src.matchAll(/min-w-\[([0-9]+)px\]/g)].map((m) => m[0])
const allowedMinWidths = new Set(['min-w-[560px]', 'min-w-[680px]', 'min-w-[720px]'])
for (const src of allSources) {
  for (const cls of minWidths(src)) {
    assert.ok(
      allowedMinWidths.has(cls),
      `Only the three admin tables may use a fixed min-width; found ${cls} elsewhere`,
    )
  }
}

console.log('Responsive source-contract guards OK (navbar breakpoint, wrapping, touch targets, table scroll containers).')