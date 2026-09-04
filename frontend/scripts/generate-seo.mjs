// Casa Aurelia — SEO site assets generator (Original Phase 14).
//
// Generates public/robots.txt and public/sitemap.xml from the build-time
// production origin (VITE_SITE_URL), keeping robots/sitemap/canonical all a
// function of the SAME configured origin (the architectural configuration
// point introduced in utils/seo.ts, following the existing VITE_API_URL
// pattern).
//
// * When VITE_SITE_URL is set: absolute URLs are emitted.
// * When it is NOT set (dev / pre-deploy): robots.txt is still written with
//   its always-valid disallow rules (no false Sitemap line), and sitemap.xml
//   is written as a valid XML stub with NO fake URLs.
//
// Run before `vite build` so Vite copies the generated files from public/ into
// dist/. Wired up in package.json as part of the build.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicDir = join(root, 'public')

const origin = (process.env.VITE_SITE_URL || '').replace(/\/+$/, '')

// Indexable public marketing routes. Transactional / private routes
// (reservation lookup, confirmation, admin) and the 404 are intentionally
// excluded: they are noindex and not sitemap candidates.
const INDEXABLE_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/menu', changefreq: 'weekly', priority: '0.9' },
  { path: '/reservations', changefreq: 'weekly', priority: '0.9' },
  { path: '/signatures', changefreq: 'monthly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/gallery', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
]

const PRIVATE_PATHS = [
  '/admin',
  '/reservation-lookup',
  '/reservation-confirmed',
]

function renderRobots() {
  const disallows = PRIVATE_PATHS.map((p) => `Disallow: ${p}`).join('\n')
  let sitemapDirective = '# Sitemap: set VITE_SITE_URL at build to emit this site\'s absolute sitemap.'

  if (origin) {
    sitemapDirective = `Sitemap: ${origin}/sitemap.xml`
  }

  return ['User-agent: *', disallows, '', sitemapDirective, ''].join('\n')
}

function renderSitemap() {
  if (!origin) {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!-- sitemap.xml is generated at build time from the VITE_SITE_URL origin.',
      '     No production origin is configured, so no URLs are emitted here.',
      '     Set VITE_SITE_URL (e.g. https://casaaurelia.example) at the production',
      '     build to populate the real sitemap URLs. -->',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" />',
      '',
    ].join('\n')
  }

  const urls = INDEXABLE_ROUTES.map(
    (r) =>
      `  <url>\n    <loc>${origin}${r.path === '/' ? '/' : r.path}</loc>\n` +
      `    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`,
  ).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n')
}

mkdirSync(publicDir, { recursive: true })
writeFileSync(join(publicDir, 'robots.txt'), renderRobots())
writeFileSync(join(publicDir, 'sitemap.xml'), renderSitemap())

console.log(`[generate-seo] wrote public/robots.txt and public/sitemap.xml (origin: ${origin || 'NOT SET'})`)
