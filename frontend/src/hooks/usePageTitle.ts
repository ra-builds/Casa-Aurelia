import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import {
  buildCanonicalUrl,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_TITLE,
  getOgLocale,
  SITE_NAME,
  SITE_URL,
} from '../utils/seo'

export function usePageTitle(titleKey?: string) {
  const { t } = useTranslation()

  useEffect(() => {
    const prev = document.title
    const title = titleKey ? t(titleKey) : t('pageTitles.home')
    document.title = title || DEFAULT_TITLE
    return () => {
      document.title = prev
    }
  }, [titleKey, t])
}

export function useMetaDescription(descriptionKey: string) {
  const { t } = useTranslation()

  useEffect(() => {
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', t(descriptionKey))
  }, [descriptionKey, t])
}

function getOrCreateMeta(attr: 'name' | 'property', key: string): HTMLMetaElement {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attr, key)
    document.head.appendChild(meta)
  }
  return meta
}

function getOrCreateLink(rel: string): HTMLLinkElement {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', rel)
    document.head.appendChild(link)
  }
  return link
}

function removeMeta(attr: 'name' | 'property', key: string): void {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove()
}

export interface OpenGraphOptions {
  title: string
  description?: string
  url: string
  image?: string
  imageAlt?: string
}

/**
 * Canonical URL. Derived from the production origin (VITE_SITE_URL) and the
 * current pathname — never containing query parameters. Falls back to a
 * path-only URL when no origin is configured rather than inventing a domain.
 */
export function useCanonical(path?: string) {
  const { pathname } = useLocation()
  const canonical = buildCanonicalUrl(SITE_URL, path ?? pathname)

  useEffect(() => {
    getOrCreateLink('canonical').setAttribute('href', canonical)
    return () => {
      document.head.querySelector('link[rel="canonical"]')?.remove()
    }
  }, [canonical])
}

/**
 * Robots noindex/nofollow. Used for transaction / private pages (reservation
 * lookup, confirmation, admin) and the soft-404 page.
 */
export function useNoIndex(active = true) {
  useEffect(() => {
    if (!active) return
    getOrCreateMeta('name', 'robots').setAttribute('content', 'noindex, nofollow')
    return () => {
      removeMeta('name', 'robots')
    }
  }, [active])
}

export function useOpenGraph({ title, description, url, image, imageAlt }: OpenGraphOptions) {
  const { i18n } = useTranslation()

  useEffect(() => {
    const locale = getOgLocale(i18n.language)
    getOrCreateMeta('property', 'og:title').setAttribute('content', title)
    getOrCreateMeta('property', 'og:type').setAttribute('content', 'website')
    getOrCreateMeta('property', 'og:url').setAttribute('content', url)
    getOrCreateMeta('property', 'og:image').setAttribute('content', image ?? DEFAULT_OG_IMAGE)
    getOrCreateMeta('property', 'og:image:alt').setAttribute('content', imageAlt ?? DEFAULT_OG_IMAGE_ALT)
    getOrCreateMeta('property', 'og:site_name').setAttribute('content', SITE_NAME)
    getOrCreateMeta('property', 'og:locale').setAttribute('content', locale)
    if (description) getOrCreateMeta('property', 'og:description').setAttribute('content', description)
  }, [title, description, url, image, imageAlt, i18n.language])
}

export function useTwitterCard({ title, description, image }: OpenGraphOptions) {
  useEffect(() => {
    getOrCreateMeta('name', 'twitter:card').setAttribute('content', 'summary_large_image')
    getOrCreateMeta('name', 'twitter:title').setAttribute('content', title)
    getOrCreateMeta('name', 'twitter:image').setAttribute('content', image ?? DEFAULT_OG_IMAGE)
    if (description) getOrCreateMeta('name', 'twitter:description').setAttribute('content', description)
  }, [title, description, image])
}

export interface PageSeoOptions {
  titleKey?: string
  descriptionKey?: string
  path?: string
  noindex?: boolean
}

/**
 * Unified per-page SEO. Composes title, meta description, canonical, Open
 * Graph and Twitter tags from a single call site, so pages do not duplicate
 * metadata logic. Reuses the same tag-updating primitives as the atomic hooks
 * above (single metadata architecture).
 */
export function usePageSeo({ titleKey, descriptionKey, path, noindex }: PageSeoOptions) {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()

  const canonical = buildCanonicalUrl(SITE_URL, path ?? pathname)
  const title = titleKey ? t(titleKey) : t('pageTitles.home')
  const description = descriptionKey ? t(descriptionKey) : undefined
  const opts: OpenGraphOptions = { title, description, url: canonical }

  usePageTitle(titleKey)
  useCanonical(path)
  useNoIndex(typeof noindex === 'boolean' ? noindex : false)

  useEffect(() => {
    const locale = getOgLocale(i18n.language)
    getOrCreateMeta('property', 'og:title').setAttribute('content', opts.title)
    getOrCreateMeta('property', 'og:type').setAttribute('content', 'website')
    getOrCreateMeta('property', 'og:url').setAttribute('content', opts.url)
    getOrCreateMeta('property', 'og:image').setAttribute('content', opts.image ?? DEFAULT_OG_IMAGE)
    getOrCreateMeta('property', 'og:image:alt').setAttribute('content', opts.imageAlt ?? DEFAULT_OG_IMAGE_ALT)
    getOrCreateMeta('property', 'og:site_name').setAttribute('content', SITE_NAME)
    getOrCreateMeta('property', 'og:locale').setAttribute('content', locale)
    if (opts.description) getOrCreateMeta('property', 'og:description').setAttribute('content', opts.description)

    getOrCreateMeta('name', 'twitter:card').setAttribute('content', 'summary_large_image')
    getOrCreateMeta('name', 'twitter:title').setAttribute('content', opts.title)
    getOrCreateMeta('name', 'twitter:image').setAttribute('content', opts.image ?? DEFAULT_OG_IMAGE)
    if (opts.description) getOrCreateMeta('name', 'twitter:description').setAttribute('content', opts.description)
  }, [opts.title, opts.description, opts.url, opts.image, opts.imageAlt, i18n.language])
}
