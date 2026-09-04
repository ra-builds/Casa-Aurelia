import { useEffect, useState } from 'react'
import { menuApi } from '../services/api'
import type { MenuItem } from '../types'

export interface FeaturedDish extends MenuItem {
  image: string | null
}

/**
 * Featured dishes pulled live from the menu API (is_featured). The photograph
 * is the database's image_url (admin-set or curated seed); a null image is
 * rendered by MenuImage's premium monogram fallback — no client-side mapping.
 */
export function useFeaturedDishes(limit = 9) {
  const [dishes, setDishes] = useState<FeaturedDish[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    setError(false)
    menuApi
      .getMenu()
      .then((data) => {
        if (cancelled) return
        const featured = data.items
          .filter((item) => item.is_featured)
          .slice(0, limit)
        setDishes(
          featured.map((item) => ({
            ...item,
            image: item.image_url ?? null,
          })),
        )
      })
      .catch(() => {
        if (cancelled) return
        setDishes([])
        setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [limit])

  return { dishes, loading, error }
}