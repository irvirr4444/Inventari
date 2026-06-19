import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { login, signup, fetchSession } from '../lib/api/auth'
import { ApiError } from '../lib/api/http'
import { useAuth } from '../lib/auth/AuthProvider'
import { getPostAuthPath } from '../lib/auth/postAuthRedirect'
import {
  GoogleSignInButton,
  isGoogleSignInConfigured,
} from '../features/auth/GoogleSignInButton'
import { ErrorAlert } from '../components/ErrorAlert'

type AuthMode = 'signin' | 'signup'

function mapAuthError(err: unknown, mode: AuthMode): string {
  if (err instanceof ApiError) {
    if (err.status === 401 && err.message === 'Account created with Google') {
      return 'Kjo llogari eshte krijuar me Google. Hyr me Google.'
    }
    if (err.status === 401) return 'Email ose fjalekalimi i pasakte.'
    if (err.status === 409) return 'Ky email eshte i regjistruar.'
    if (err.status >= 500) return 'Gabim ne rrjet. Provo perseri.'
    return err.message || 'Gabim ne rrjet. Provo perseri.'
  }
  return mode === 'signup' ? 'Regjistrimi deshtoi.' : 'Hyrja deshtoi.'
}

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refreshSession } = useAuth()

  const initialMode: AuthMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  const [mode, setMode] = React.useState<AuthMode>(initialMode)
  const [emri, setEmri] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [googleLoading, setGoogleLoading] = React.useState(false)

  const googleEnabled = isGoogleSignInConfigured()
  const formBusy = loading || googleLoading

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError(null)
  }

  const navigateAfterAuth = async () => {
    await refreshSession()
    const session = await fetchSession()
    if (session.ok) {
      navigate(getPostAuthPath(session.user), { replace: true })
    } else {
      setError('Hyrja deshtoi. Provo perseri.')
    }
  }

  const validate = (): string | null => {
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      return 'Ploteso te gjitha fushat e detyrueshme.'
    }
    if (mode === 'signup' && trimmedPassword.length < 8) {
      return 'Fjalekalimi duhet te kete te pakten 8 karaktere.'
    }
    return null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const trimmedEmail = email.trim()
      const trimmedPassword = password.trim()

      if (mode === 'signin') {
        await login({ email: trimmedEmail, password: trimmedPassword })
        await navigateAfterAuth()
      } else {
        await signup({
          email: trimmedEmail,
          password: trimmedPassword,
          emri: emri.trim() || undefined,
        })
        await refreshSession()
        navigate('/onboarding/locations', { replace: true })
      }
    } catch (err) {
      setError(mapAuthError(err, mode))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card auth-card">
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <h1>Inventari</h1>
      </div>

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
        <div className={`form-group auth-name-field ${mode === 'signup' ? 'visible' : ''}`}>
          <label className="label">Emri</label>
          <input
            className="input"
            value={emri}
            onChange={(e) => setEmri(e.target.value)}
            autoComplete="name"
            disabled={formBusy}
          />
        </div>

        <div className="form-group">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus={mode === 'signin'}
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

        {error ? (
          <div className="auth-error-slot">
            <ErrorAlert message={error} style={{ padding: '10px 14px', fontSize: 13 }} />
          </div>
        ) : null}

        <button type="submit" className="btn primary" disabled={formBusy}>
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
            onError={(message) => setError(message)}
            onClearError={() => setError(null)}
            onLoadingChange={setGoogleLoading}
            disabled={loading}
          />
        </div>
      ) : null}
    </section>
  )
}
