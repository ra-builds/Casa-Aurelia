import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Restaurant } from '../types'
import { restaurantApi } from '../services/api'

interface RestaurantContextType {
  restaurant: Restaurant | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const RestaurantContext = createContext<RestaurantContextType | null>(null)

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    restaurantApi
      .getRestaurant()
      .then((data) => {
        if (!cancelled) {
          setRestaurant(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load restaurant data')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const data = await restaurantApi.getRestaurant()
      setRestaurant(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load restaurant data')
    }
  }, [])

  return (
    <RestaurantContext.Provider value={{ restaurant, isLoading, error, refresh }}>
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant() {
  const context = useContext(RestaurantContext)
  if (!context) throw new Error('useRestaurant must be used within RestaurantProvider')
  return context
}
