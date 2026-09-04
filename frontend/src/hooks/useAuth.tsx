import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { authApi } from '../services/api'
import { setAuthLogoutCallback } from '../utils/helpers'
import { clearAccessToken, getAccessToken } from '../utils/authToken'
import type { AuthUser } from '../types'

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(async () => {
    // Best-effort: clear the HttpOnly refresh cookie on the server, then drop the
    // in-memory access token and local session state regardless of network outcome.
    try {
      await authApi.logout()
    } catch {
      // ignore — local state must still clear even if the server is unreachable
    }
    clearAccessToken()
    setUser(null)
  }, [])

  useEffect(() => {
    setAuthLogoutCallback(() => { void logout() })
    return () => setAuthLogoutCallback(null)
  }, [logout])

  const loadUser = useCallback(async () => {
    try {
      if (!getAccessToken()) {
        // No access token in memory (e.g. after a page reload): restore the
        // session silently from the HttpOnly refresh cookie if one is valid.
        await authApi.refresh()
      }
      const userData = await authApi.me()
      setUser(userData)
    } catch {
      clearAccessToken()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (email: string, password: string) => {
    await authApi.login(email, password)
    const userData = await authApi.me()
    setUser(userData)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
