import * as React from 'react'
import { currentSession, login, logout } from './lib/api'
import { DashboardPage } from './pages/DashboardPage'

export default function App() {
  const [isAuthed, setIsAuthed] = React.useState(false)
  const [checkingSession, setCheckingSession] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    currentSession()
      .then((ok) => {
        if (!cancelled) setIsAuthed(ok)
      })
      .catch(() => {
        if (!cancelled) setIsAuthed(false)
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (checkingSession) {
    return (
      <main className="container auth-container">
        <section className="card auth-card">
          <h1>Inventari</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Duke kontrolluar sesionin...
          </p>
        </section>
      </main>
    )
  }

  if (!isAuthed) {
    return (
      <main className="container auth-container">
        <LoginPage
          onSuccess={() => {
            setIsAuthed(true)
          }}
        />
      </main>
    )
  }

  return (
    <div>
      <div className="app-actions">
        <button
          type="button"
          className="btn"
          onClick={async () => {
            await logout().catch(() => undefined)
            setIsAuthed(false)
          }}
        >
          Dil
        </button>
      </div>
      <main className="container">
        <DashboardPage />
      </main>
    </div>
  )
}

function LoginPage(props: { onSuccess: () => void }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [snackbar, setSnackbar] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!snackbar) return
    const timer = window.setTimeout(() => setSnackbar(null), 3500)
    return () => window.clearTimeout(timer)
  }, [snackbar])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSnackbar(null)
    setLoading(true)
    try {
      await login({ email: email.trim(), password: password.trim() })
      props.onSuccess()
    } catch {
      setSnackbar('Emaili ose password gabim.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="card auth-card">
        <div style={{ marginBottom: 22 }}>
          <h1>Inventari</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Hyr per te menaxhuar produktet dhe veprimet.
          </p>
        </div>

        <form className="form-grid" onSubmit={submit}>
          <div className="form-group">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Duke hyre...' : 'Hyr'}
          </button>
        </form>
      </section>

      {snackbar && (
        <div className="snackbar" role="status" aria-live="polite">
          {snackbar}
        </div>
      )}
    </>
  )
}
