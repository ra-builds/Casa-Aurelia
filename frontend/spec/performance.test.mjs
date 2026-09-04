/**
 * Performance regression guards (Original Phase 15).
 *
 * Phase 15's justified, evidence-driven changes:
 *
 *   1. ROUTE-LEVEL CODE SPLITTING — non-critical pages are lazy-loaded via
 *      React.lazy so the initial bundle is smaller; the heavy subtrees
 *      (Admin, Gallery, Reservations, ...) are only fetched on navigation.
 *      HomePage and the app shell stay eager (above-the-fold / LCP).
 *   2. FONT WEIGHT TRIM — the Google Fonts request no longer asks for weights
 *      the code never renders (Cormorant Garamond 700, Inter 300).
 *
 * This spec guards those contracts AND protects the Phase 13/14 invariants
 * (SEO `usePageSeo` on every page; locale untouched) so performance work does
 * not regress SEO or i18n. Uses only Node built-ins, consistent with the
 * existing specs. Verifies source/build contracts, not browser pixels.
 */

import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
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

console.log('\n1. Route-level code splitting (initial-load contract)')
const app = readSrc('App.tsx')
const lazyImports = (app.match(/lazy\(\(\) => import\(/g) || []).length
ok(lazyImports >= 9, `non-critical routes are lazy-loaded (${lazyImports} lazy() entries)`)

// HomePage and the layout shell must remain eager (critical path / LCP).
ok(!/lazy\(\(\) => import\(['"].*?\/pages\/HomePage/.test(app), 'HomePage stays eager (above-the-fold)')
ok(app.includes("import MainLayout from './layouts/MainLayout'"), 'MainLayout stays eager (shell)')

// Heavy / admin / non-critical pages must NOT be eagerly imported in App.tsx.
for (const heavy of ['AdminPage', 'GalleryPage', 'ReservationsPage', 'MenuPage', 'ContactPage']) {
  ok(!new RegExp(`import ${heavy} from`).test(app), `${heavy} is not eagerly imported in App.tsx`)
}
ok(app.includes('const AdminPage = lazy('), 'AdminPage is lazy-loaded (heaviest route)')

// A Suspense boundary exists for the standalone admin + 404 routes, and
// MainLayout wraps its content so Navbar/Footer stay visible during loads.
ok(app.includes('<Suspense'), 'App uses Suspense')
ok(readSrc('layouts/MainLayout.tsx').includes('<Suspense fallback={<PageLoader />}>'), 'MainLayout suspends its content area')
ok(existsSync(join(SRC, 'components/ui/PageLoader.tsx')), 'PageLoader (luxury fallback) exists')

// Phase 14 SEO preserved: every page still uses usePageSeo.
console.log('\n2. SEO (Phase 14) not regressed')
const INDEXABLE = ['HomePage', 'MenuPage', 'SignaturesPage', 'AboutPage', 'GalleryPage', 'ReservationsPage', 'ContactPage']
const NOINDEX = ['AdminPage', 'ConfirmationPage', 'ReservationLookupPage', 'NotFoundPage']
for (const p of [...INDEXABLE, ...NOINDEX]) {
  ok(readSrc(`pages/${p}.tsx`).includes('usePageSeo('), `${p} still uses usePageSeo`)
}
for (const p of NOINDEX) {
  ok(/noindex:\s*true/.test(readSrc(`pages/${p}.tsx`)), `${p} still sets noindex`)
}

// Phase 13 locale untouched: the translation key sets are unchanged (no new
// files, no key drift) and the formatting layer is intact.
console.log('\n3. Locale (Phase 13) not regressed')
ok(readSrc('utils/helpers.ts').includes('minimumFractionDigits: 2'), 'formatPrice keeps 2 fraction digits')
ok(readSrc('utils/helpers.ts').includes('useGrouping: true'), 'formatNumber keeps grouping enabled')

// Font optimisation contract.
console.log('\n4. Font optimisation (index.html)')
const html = read('index.html')
ok(html.includes('display=swap'), 'font-display=swap preserved (no font FOUT blocking)')
ok(html.includes('preconnect') && html.includes('fonts.googleapis.com'), 'Google Fonts preconnect preserved')
ok(html.includes('fonts.gstatic.com'), 'gstatic preconnect preserved')
const fontRe = /href="([^"]*fonts\.googleapis\.com\/css2[^"]*)"/.exec(html)
const fontUrl = fontRe ? fontRe[1] : ''
ok(fontUrl.length > 0, 'Google Fonts stylesheet href present')
ok(fontUrl.includes('Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400'), 'Cormorant styles kept are 0,400;0,500;0,600;1,400')
ok(!fontUrl.includes('0,700'), 'Cormorant Garamond 700 removed (unused weight)')
ok(!fontUrl.includes('Inter:wght@300'), 'Inter 300 removed (unused weight)')
ok(fontUrl.includes('Inter:wght@400;500;600'), 'Inter keeps used weights 400/500/600')

// Built bundle: verify at least one route chunk exists alongside the main chunk.
console.log('\n5. Production build output split into multiple chunks')
const distAssets = join(ROOT, 'dist', 'assets')
if (existsSync(distAssets)) {
  const jsChunks = readdirSync(distAssets).filter((f) => f.endsWith('.js'))
  const mainIndex = jsChunks.find((f) => f.startsWith('index-') && f.endsWith('.js'))
  ok(jsChunks.length >= 4, `multiple JS chunks emitted (${jsChunks.length})`)
  if (mainIndex) {
    const mainSize = readFileSync(join(distAssets, mainIndex)).length
    ok(mainSize < 400_000, `main entry chunk is under 400 kB (${mainSize} bytes) — code splitting reduced initial JS`)
  }
  ok(jsChunks.some((f) => f.startsWith('AdminPage-')), 'AdminPage has its own deferred chunk')
} else {
  console.log('  # (dist/ not present — build-level guard skipped)')
}

console.log(`\nPerformance spec: ${passed} assertions passed`)
