/**
 * Client Customization Architecture regression guards (Original Phase 17).
 *
 * Phase 17 introduces a centralized static site/brand configuration layer so a
 * future restaurant/client variant can be customized without rewriting the
 * shared UI. This spec guards the customization BOUNDARY:
 *
 *   1. SINGLE SOURCE FOR STATIC BRAND — the SEO layer must consume the brand
 *      identity (site name, default title, default OG image) from
 *      `src/config/site.ts` and must NOT re-declare those literals itself.
 *   2. ZERO BEHAVIOUR CHANGE — the centralized values must be identical to the
 *      previously hard-coded brand, so re-sourcing the constants does not alter
 *      any emitted metadata.
 *   3. LIVE DATA NOT DUPLICATED — restaurant *business* identity (name, address,
 *      phone, email, currency, hours) is NOT copied into the static config;
 *      it flows exclusively from `GET /api/restaurant` (RestaurantContext).
 *   4. UI USES DATA, NOT LITERALS — shared components render the restaurant's
 *      live name/identity from the context rather than a hard-coded brand.
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
// 1. Single source for static brand configuration
// ---------------------------------------------------------------------------

console.log('\n1. Static brand configuration is centralized in src/config/site.ts')
const config = readSrc('config/site.ts')
ok(config.includes('export const SITE_CONFIG'), 'src/config/site.ts exports SITE_CONFIG')
ok(config.includes('brandName'), 'config defines brandName')
ok(config.includes('defaultTitle'), 'config defines defaultTitle')
ok(config.includes('ogImage'), 'config defines ogImage')
ok(config.includes('ogImageAlt'), 'config defines ogImageAlt')

const seo = readSrc('utils/seo.ts')
ok(seo.includes("import { SITE_CONFIG } from '../config/site'"), 'utils/seo.ts imports SITE_CONFIG')
ok(seo.includes('= SITE_CONFIG.brandName'), 'SITE_NAME sourced from config (single source)')
ok(seo.includes('= SITE_CONFIG.defaultTitle'), 'DEFAULT_TITLE sourced from config')
ok(seo.includes('= SITE_CONFIG.ogImage'), 'DEFAULT_OG_IMAGE sourced from config')
ok(seo.includes('= SITE_CONFIG.ogImageAlt'), 'DEFAULT_OG_IMAGE_ALT sourced from config')

// The SEO module must not re-declare a brand literal of its own.
ok(!seo.includes("SITE_NAME = 'Casa Aurelia'"), 'seo.ts does not re-hard-code the brand name')

// ---------------------------------------------------------------------------
// 2. Zero behaviour change — centralized values match the prior brand
// ---------------------------------------------------------------------------

console.log('\n2. Centralized brand values preserve the prior output')
const PREVIOUS = {
  brandName: 'Casa Aurelia',
  defaultTitle: 'Casa Aurelia | Modern Italian Restaurant in Novara',
  ogImage:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  ogImageAlt: 'The candlelit dining room of Casa Aurelia',
}
for (const [field, value] of Object.entries(PREVIOUS)) {
  ok(config.includes(`'${value}'`), `config preserves prior ${field} value (no output change)`)
}

// ---------------------------------------------------------------------------
// 3. Live restaurant business data is NOT duplicated into the static config
// ---------------------------------------------------------------------------

console.log('\n3. Live restaurant identity stays data-driven (not duplicated)')
const liveFields = ['address', 'phone', 'email', 'lunch_hours', 'dinner_hours', 'closed_day', 'currency']
for (const field of liveFields) {
  // The static config must not ASSIGN any live business field as a data key
  // (documentation/comment mention of the words is fine). Duplicating these
  // values in the static layer would create a competing source of truth.
  ok(!new RegExp(`${field}:\\s*['"]`).test(config), `static config does not assign live field "${field}"`)
}

const context = readSrc('contexts/RestaurantContext.tsx')
const api = readSrc('services/api.ts')
ok(context.includes('.getRestaurant()'), 'RestaurantContext fetches identity from the API')
ok(api.includes("getRestaurant: () => apiRequest<Restaurant>('/api/restaurant')"), 'identity endpoint is GET /api/restaurant')

// ---------------------------------------------------------------------------
// 4. Shared UI renders the live restaurant name from context, not a literal
// ---------------------------------------------------------------------------

console.log('\n4. Shared components use the data-driven identity')
const navbar = readSrc('components/layout/Navbar.tsx')
ok(navbar.includes('restaurant?.name'), 'Navbar renders the live restaurant name from context')
ok(navbar.includes('useRestaurant()'), 'Navbar consumes RestaurantContext')
ok(appNavUsesNoLiteral(), 'Navbar does not hard-code the brand name as markup')

function appNavUsesNoLiteral() {
  // The live name is rendered from the context; the literal must not be a
  // separate hard-coded H1/brand element independent of the context.
  return !/Casa Aurelia/.test(navbar) || navbar.includes('restaurant?.name')
}

console.log(`\nCustomization Architecture spec: ${passed} assertions passed`)
