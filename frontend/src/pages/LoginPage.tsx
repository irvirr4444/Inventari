import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Snackbar } from '../components/Snackbar'
import { login, signup, fetchSession } from '../lib/api/auth'
import { ApiError } from '../lib/api/http'
import { useAuth } from '../lib/auth/AuthProvider'
import { getPostAuthPath } from '../lib/auth/postAuthRedirect'
import { useSnackbar } from '../hooks/useSnackbar'
import {
  GoogleSignInButton,
  isGoogleSignInConfigured,
} from '../features/auth/GoogleSignInButton'
import { AuthBrandMark } from '../components/AuthBrandMark'
import { Link } from 'react-router-dom'

type AuthMode = 'signin' | 'signup'

const AUTH_REQUEST_TIMEOUT_MS = 45_000

function withAuthRequestTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS)
  return run(controller.signal).finally(() => window.clearTimeout(timeoutId))
}

function mapAuthError(err: unknown, mode: AuthMode): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return err.message
    if (err.status === 401 && err.message === 'Account created with Google') {
      return 'Kjo llogari eshte krijuar me Google. Hyr me Google.'
    }
    if (err.status === 400 && err.message === 'Use sign in for email accounts') {
      return 'Per hyrje me email, perdor tab-in Hyr.'
    }
    if (err.status === 401) return 'Emri ose fjalekalimi i pasakte.'
    if (err.status === 409) return 'Ky emer eshte i regjistruar.'
    if (err.status >= 500) return 'Gabim ne rrjet. Provo perseri.'
    return err.message || 'Gabim ne rrjet. Provo perseri.'
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'Serveri po ngarkohet. Provo perseri pas disa sekondash.'
  }
  return mode === 'signup' ? 'Regjistrimi deshtoi.' : 'Hyrja deshtoi.'
}

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refreshSession } = useAuth()
  const { snackbar, notify, clear } = useSnackbar()

  const initialMode: AuthMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  const [mode, setMode] = React.useState<AuthMode>(initialMode)
  const [emri, setEmri] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [googleLoading, setGoogleLoading] = React.useState(false)
  const [acceptedLegal, setAcceptedLegal] = React.useState(false)

  const googleEnabled = isGoogleSignInConfigured()
  const formBusy = loading || googleLoading
  const signupBlocked = mode === 'signup' && !acceptedLegal

  const showError = (message: string) => {
    notify(message, 'error')
  }

  const switchMode = (next: AuthMode) => {
    setMode(next)
    if (next === 'signin') setAcceptedLegal(false)
    clear()
  }

  const navigateAfterAuth = async () => {
    await withAuthRequestTimeout(async (signal) => {
      const session = await fetchSession({ signal })
      if (!session.ok) {
        throw new Error('Session cookie missing after login')
      }
      await refreshSession()
      const path = getPostAuthPath(session.user)
      const qs = searchParams.toString()
      navigate(qs ? `${path}?${qs}` : path, { replace: true })
    }).catch(() => {
      showError(
        'Hyrja u krye por sesioni nuk u ruajt. Mbyll aplikacionin, hape perseri dhe provo.',
      )
    })
  }

  const validate = (): string | null => {
    const trimmedEmri = emri.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmri || !trimmedPassword) {
      return 'Ploteso te gjitha fushat e detyrueshme.'
    }
    if (mode === 'signup' && trimmedEmri.includes('@')) {
      return 'Per hyrje me email, perdor tab-in Hyr.'
    }
    if (mode === 'signup' && trimmedPassword.length < 8) {
      return 'Fjalekalimi duhet te kete te pakten 8 karaktere.'
    }
    if (mode === 'signup' && !acceptedLegal) {
      return 'Duhet te pranosh Politiken e privatësisë dhe Kushtet e përdorimit.'
    }
    return null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    clear()

    const validationError = validate()
    if (validationError) {
      showError(validationError)
      return
    }

    setLoading(true)
    console.info('[inventari-auth] submitting', mode)
    try {
      const trimmedEmri = emri.trim()
      const trimmedPassword = password.trim()

      if (mode === 'signin') {
        await withAuthRequestTimeout((signal) =>
          login({ emri: trimmedEmri, password: trimmedPassword }, { signal }),
        )
        await navigateAfterAuth()
      } else {
        await withAuthRequestTimeout((signal) =>
          signup({ emri: trimmedEmri, password: trimmedPassword }, { signal }),
        )
        await refreshSession()
        navigate('/onboarding', { replace: true })
      }
    } catch (err) {
      showError(mapAuthError(err, mode))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="auth-card">
        <AuthBrandMark />

        <div className="auth-mode-toggle">
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => switchMode('signin')}
              disabled={formBusy}
            >
              Hyr
            </button>
            <button
              type="button"
              className={`toggle-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
              disabled={formBusy}
            >
              Regjistrohu
            </button>
          </div>
        </div>

        <form className="form-grid" onSubmit={submit}>
          <div className="form-group">
            <label className="label">Emri</label>
            <input
              className="input"
              value={emri}
              onChange={(e) => setEmri(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={formBusy}
            />
          </div>

          <div className="form-group">
            <label className="label">Fjalekalimi</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              disabled={formBusy}
            />
          </div>

          <button type="submit" className="btn primary" disabled={formBusy || signupBlocked}>
            {loading
              ? mode === 'signin'
                ? 'Duke hyre...'
                : 'Duke krijuar...'
              : mode === 'signin'
                ? 'Hyr'
                : 'Krijo Llogari'}
          </button>

        </form>

        {googleEnabled ? (
          <div className="auth-google-section">
            <div className="auth-divider">ose</div>
            <GoogleSignInButton
              onSuccess={navigateAfterAuth}
              onError={showError}
              onClearError={clear}
              onLoadingChange={setGoogleLoading}
              disabled={loading || (mode === 'signup' && !acceptedLegal)}
            />
          </div>
        ) : null}

        {mode === 'signup' ? (
          <label className="auth-legal-consent auth-legal-footer">
            <input
              type="checkbox"
              className="auth-legal-consent__input"
              checked={acceptedLegal}
              onChange={(e) => setAcceptedLegal(e.target.checked)}
              disabled={formBusy}
            />
            <span className="auth-legal-consent__text">
              Kam lexuar dhe pranoj{' '}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer">
                Politikën e privatësisë
              </Link>{' '}
              dhe{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer">
                Kushtet e përdorimit
              </Link>
            </span>
          </label>
        ) : (
          <p className="auth-legal-footer">
            <Link to="/privacy">Politika e privatësisë</Link>
            <span className="auth-legal-footer-separator" aria-hidden="true">
              ·
            </span>
            <Link to="/terms">Kushtet</Link>
          </p>
        )}
      </section>
      <Snackbar snackbar={snackbar} />
    </>
  )
}
