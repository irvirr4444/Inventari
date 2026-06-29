import * as React from 'react'
import type { SessionUser } from './types'
import { fetchSession, logout as apiLogout } from '../api/auth'

type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  refreshSession: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

/** Render free tier can take 30–60s to wake; don't block the login UI that long. */
const SESSION_CHECK_TIMEOUT_MS = 12_000

async function fetchSessionWithTimeout(): Promise<Awaited<ReturnType<typeof fetchSession>>> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS)
  try {
    return await fetchSession({ signal: controller.signal })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function AuthProvider(props: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  const refreshSession = React.useCallback(async () => {
    try {
      const res = await fetchSessionWithTimeout()
      if (res.ok) {
        setUser(res.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    }
  }, [])

  React.useEffect(() => {
    refreshSession().finally(() => setLoading(false))
  }, [refreshSession])

  const logout = React.useCallback(async () => {
    await apiLogout().catch(() => undefined)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refreshSession, logout }}>
      {props.children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useRequireAuth() {
  const auth = useAuth()
  return auth
}
