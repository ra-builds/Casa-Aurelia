/**
 * Casa Aurelia — Restaurant Template Configuration (Original Phases 17–18).
 *
 * This is the single customization point for the STATIC brand identity that is
 * not already served as live data by the backend. `GET /api/restaurant` (via
 * RestaurantContext) supplies the restaurant's live business record (name,
 * tagline, address, phone, currency, hours, ...); anything here is the
 * build-time / fallback brand identity used before or independent of that data.
 *
 * CUSTOMIZATION BOUNDARY
 * ----------------------
 * To create a client / restaurant variant, change the STATIC values in this
 * file plus (as required) the UI language strings under src/i18n and the
 * imagery in src/utils/constants.ts / src/utils/galleryImages.ts. Do NOT edit
 * the shared UI components.
 *
 * Genuinely application-structural constants (nav structure, route set, time
 * slots, reservation rules) stay in src/utils/constants.ts and are intentionally
 * NOT exposed here.
 *
 * The CSS theme tokens (colors, typography, shadows) are the single source of
 * truth in src/index.css `@theme` (Tailwind v4) and are intentionally NOT
 * duplicated into JS — the visual identity must remain a single source of truth
 * in the stylesheet, and Tailwind's own token system is not replaced.
 */

export interface SiteConfig {
  /** Brand name — used for og:site_name and as the default <title> base. */
  brandName: string
  /** Default document title used when no localized page title is available. */
  defaultTitle: string
  /** Verified default social-preview image (absolute URL). */
  ogImage: string
  /** Human-readable alt for the default social-preview image. */
  ogImageAlt: string
  /** Short business-type label shown near the brand name (e.g. "Ristorante", "Trattoria", "Bistro"). */
  businessTypeLabel: string
  /** Default ISO 4217 currency code used when the live API data has not yet loaded. */
  defaultCurrency: string
  /** Prefix for customer-facing reservation reference codes. */
  referenceCodePrefix: string
}

/**
 * Static site / brand configuration. These defaults are intentionally identical
 * to the values previously hard-coded across the SEO layer, so changing the
 * source does not change the output; a client variant changes these values.
 */
export const SITE_CONFIG: SiteConfig = {
  brandName: 'Casa Aurelia',
  defaultTitle: 'Casa Aurelia | Modern Italian Restaurant in Novara',
  ogImage:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  ogImageAlt: 'The candlelit dining room of Casa Aurelia',
  businessTypeLabel: 'Ristorante',
  defaultCurrency: 'EUR',
  referenceCodePrefix: 'CASA',
}
