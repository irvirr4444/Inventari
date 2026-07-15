import * as React from 'react'
import type { SessionUser } from './types'
import { fetchSession, logout as apiLogout } from '../api/auth'

type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  /** True when bootstrap is still retrying a cold/slow backend (no known session yet). */
  waking: boolean
  refreshSession: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

/** Soft timeout so the login UI can render; keep retrying in background. */
const SESSION_CHECK_TIMEOUT_MS = 8_000
const SESSION_RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 12_000]

async function fetchSessionWithTimeout(): Promise<Awaited<ReturnType<typeof fetchSession>>> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS)
  try {
    return await fetchSession({ signal: controller.signal })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function AuthProvider(props: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [waking, setWaking] = React.useState(false)
  const userRef = React.useRef<SessionUser | null>(null)
  userRef.current = user

  const refreshSession = React.useCallback(async () => {
    try {
      const res = await fetchSessionWithTimeout()
      if (res.ok) {
        setUser(res.user)
        setWaking(false)
      } else {
        setUser(null)
        setWaking(false)
      }
    } catch {
      // Transient failure: keep existing session and never block an already-authenticated UI.
      if (!userRef.current) setWaking(true)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const res = await fetchSessionWithTimeout()
        if (cancelled) return
        if (res.ok) {
          setUser(res.user)
          setWaking(false)
          return
        }
        setUser(null)
        setWaking(false)
      } catch {
        if (cancelled) return
        // Don't treat timeout as logged-out — keep retrying while showing wake UI.
        setWaking(true)
        setUser(null)

        for (const delay of SESSION_RETRY_DELAYS_MS) {
          await sleep(delay)
          if (cancelled) return
          try {
            const res = await fetchSessionWithTimeout()
            if (cancelled) return
            if (res.ok) {
              setUser(res.user)
              setWaking(false)
              return
            }
            setUser(null)
            setWaking(false)
            return
          } catch {
            // keep waking + retrying
          }
        }
        if (!cancelled) setWaking(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const logout = React.useCallback(async () => {
    await apiLogout().catch(() => undefined)
    setUser(null)
    setWaking(false)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, waking, refreshSession, logout }}>
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
