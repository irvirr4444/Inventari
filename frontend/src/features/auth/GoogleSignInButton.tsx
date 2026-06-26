import * as React from 'react'
import { loginWithGoogle } from '../../lib/api/auth'
import { ApiError } from '../../lib/api/http'
import { isCapacitorNativeApp } from '../../lib/capacitorClient'
import { useAuth } from '../../lib/auth/AuthProvider'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void
        }
      }
    }
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

let gsiScriptPromise: Promise<void> | null = null
let gsiInitialized = false

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (gsiScriptPromise) return gsiScriptPromise

  gsiScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google sign-in'))
    document.head.appendChild(script)
  })

  return gsiScriptPromise
}

export function isGoogleSignInConfigured(): boolean {
  if (isCapacitorNativeApp()) return false
  return Boolean(GOOGLE_CLIENT_ID)
}

function mapGoogleError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message === 'Invalid Google token') return 'Hyrja me Google deshtoi.'
    if (err.status >= 500) return 'Gabim ne rrjet. Provo perseri.'
    return err.message || 'Hyrja me Google deshtoi.'
  }
  return 'Gabim ne rrjet. Provo perseri.'
}

function GoogleIcon() {
  return (
    <svg className="auth-google-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export function GoogleSignInButton(props: {
  onSuccess: () => void
  onError: (message: string) => void
  onClearError?: () => void
  onLoadingChange?: (loading: boolean) => void
  disabled?: boolean
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const buttonRenderedRef = React.useRef(false)
  const requestTimeoutRef = React.useRef<number | null>(null)
  const { refreshSession } = useAuth()
  const { onSuccess, onError, onClearError, onLoadingChange, disabled } = props
  const [googleLoading, setGoogleLoading] = React.useState(false)
  const [scriptReady, setScriptReady] = React.useState(false)

  const onSuccessRef = React.useRef(onSuccess)
  const onErrorRef = React.useRef(onError)
  const onClearErrorRef = React.useRef(onClearError)

  React.useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
    onClearErrorRef.current = onClearError
  }, [onSuccess, onError, onClearError])

  const setLoading = React.useCallback(
    (loading: boolean) => {
      setGoogleLoading(loading)
      onLoadingChange?.(loading)
    },
    [onLoadingChange],
  )

  const clearRequestTimeout = React.useCallback(() => {
    if (requestTimeoutRef.current !== null) {
      window.clearTimeout(requestTimeoutRef.current)
      requestTimeoutRef.current = null
    }
  }, [])

  const handleCredential = React.useCallback(
    async (credential: string) => {
      clearRequestTimeout()
      onClearErrorRef.current?.()
      setLoading(true)
      requestTimeoutRef.current = window.setTimeout(() => {
        setLoading(false)
        onErrorRef.current('Gabim ne rrjet. Provo perseri.')
      }, 30000)

      try {
        await loginWithGoogle(credential)
        await refreshSession()
        clearRequestTimeout()
        setLoading(false)
        onSuccessRef.current()
      } catch (err) {
        clearRequestTimeout()
        setLoading(false)
        onErrorRef.current(mapGoogleError(err))
      }
    },
    [clearRequestTimeout, refreshSession, setLoading],
  )

  const credentialHandlerRef = React.useRef(handleCredential)
  React.useEffect(() => {
    credentialHandlerRef.current = handleCredential
  }, [handleCredential])

  React.useLayoutEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    let cancelled = false

    const mountButton = () => {
      const container = containerRef.current
      if (!container || !window.google?.accounts?.id || buttonRenderedRef.current) return

      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        width: Math.max(container.offsetWidth, 320),
      })
      buttonRenderedRef.current = true
      setScriptReady(true)
    }

    loadGsiScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return

        if (!gsiInitialized) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
              credentialHandlerRef.current(response.credential)
            },
          })
          gsiInitialized = true
        }

        mountButton()
      })
      .catch(() => {
        // GSI often fails in Capacitor WebView — hide button via scriptReady, no snackbar
        if (!cancelled) setScriptReady(false)
      })

    return () => {
      cancelled = true
      clearRequestTimeout()
    }
  }, [clearRequestTimeout])

  if (!GOOGLE_CLIENT_ID) return null

  const interactionDisabled = disabled || !scriptReady || googleLoading

  return (
    <div className={`auth-google-wrap${interactionDisabled ? ' is-disabled' : ''}`}>
      <div className="auth-google-facade" aria-hidden="true">
        <GoogleIcon />
        {googleLoading ? 'Duke hyre...' : 'Vazhdo me Google'}
      </div>
      <div
        ref={containerRef}
        className="auth-google-native"
        aria-label="Vazhdo me Google"
      />
    </div>
  )
}
