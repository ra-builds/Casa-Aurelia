import { useEffect } from 'react'
import { useRestaurant } from '../../contexts/RestaurantContext'
import { buildRestaurantJsonLd, SITE_URL } from '../../utils/seo'

/**
 * Injects Schema.org Restaurant / LocalBusiness JSON-LD for the site, driven
 * entirely by live restaurant data from RestaurantContext. Injected client-side
 * (the app is a client-only SPA); no fake fields are emitted — see
 * `buildRestaurantJsonLd` for the whitelist. Rendered once, inside the
 * RestaurantProvider, so it is present across the whole site.
 */
export default function StructuredData() {
  const { restaurant } = useRestaurant()

  useEffect(() => {
    const existing = document.querySelector('script[data-seo="restaurant-jsonld"]')
    existing?.remove()

    if (!restaurant) return

    const jsonLd = buildRestaurantJsonLd(restaurant, SITE_URL)
    if (!jsonLd) return

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-seo', 'restaurant-jsonld')
    script.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(script)
  }, [restaurant])

  return null
}
