/**
 * Admin Messages — Reply (mailto) regression guards.
 *
 * Source-contract spec for the Reply action added to the admin Messages
 * section (MessagesManager.tsx). It verifies:
 *
 *   1. A clearly labeled Reply action exists per message, using the i18n key
 *      `admin.messages.reply` (no hard-coded label).
 *   2. The action is a normal anchor whose `mailto:` URL is generated
 *      dynamically for the customer's email (no hard-coded address).
 *   3. The composed subject is prefixed with `Re: `.
 *   4. The subject is URL-encoded via `encodeURIComponent` (space -> %20,
 *      colon -> %3A, matching `mailto:...?subject=Re%3A%20...`).
 *   5. An empty original subject falls back to
 *      `admin.messages.replySubjectFallback`.
 *   6. Both new keys exist in all five locales and preserve equal leaf counts.
 *
 * Uses only Node built-ins, consistent with the existing specs. Verifies
 * source contracts, not browser pixels.
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
// 1. Reply action exists with a localized, accessible label
// ---------------------------------------------------------------------------

console.log('\n1. Reply action exists and is localized')
const manager = readSrc('components/admin/MessagesManager.tsx')
ok(manager.includes("t('admin.messages.reply')"), 'MessagesManager renders a Reply action via the i18n key')
ok(manager.includes('aria-label'), 'Reply action carries an accessible label')
ok(manager.includes('btn-link'), 'Reply action reuses the existing btn-link styling')

// ---------------------------------------------------------------------------
// 2. Dynamic mailto href built from the customer email (never hard-coded)
// ---------------------------------------------------------------------------

console.log('\n2. mailto: URL is generated from the customer email')
ok(/`mailto:\$\{message\.email\}\?subject=/.test(manager), 'mailto href is built dynamically from message.email')
ok(!/mailto:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(manager), 'no hard-coded customer email address in source')

// ---------------------------------------------------------------------------
// 3. Subject is prefixed with "Re:"
// ---------------------------------------------------------------------------

console.log('\n3. Subject is prefixed with Re:')
assert.ok(/`Re: \$\{subject\}`/.test(manager), 'composed subject is prefixed with "Re: "')

// ---------------------------------------------------------------------------
// 4. Subject is URL-encoded
// ---------------------------------------------------------------------------

console.log('\n4. Subject is URL-encoded')
ok(manager.includes('encodeURIComponent(`Re: ${subject}`)'), 'subject is passed through encodeURIComponent')

// ---------------------------------------------------------------------------
// 5. Empty subject falls back to the localized fallback subject
// ---------------------------------------------------------------------------

console.log('\n5. Empty subject falls back to a localized fallback')
assert.ok(
  /message\.subject\.trim\(\) \|\| t\('admin\.messages\.replySubjectFallback'\)/.test(manager),
  'empty/whitespace subject uses admin.messages.replySubjectFallback',
)

// ---------------------------------------------------------------------------
// 6. i18n parity — both keys present in all five locales (equal leaf counts)
// ---------------------------------------------------------------------------

console.log('\n6. Both Reply keys exist in all five locales (parity preserved)')
const LOCALE_FILES = ['en', 'it', 'fr', 'de', 'es']
const counts = {}
for (const lang of LOCALE_FILES) {
  const raw = readSrc(`i18n/translations/${lang}.json`)
  const json = JSON.parse(raw)
  assert.ok(json.admin?.messages?.reply, `${lang}.json has admin.messages.reply`)
  assert.ok(json.admin?.messages?.replySubjectFallback, `${lang}.json has admin.messages.replySubjectFallback`)
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

console.log(`\nAdmin Messages Reply spec: ${passed} assertions passed`)