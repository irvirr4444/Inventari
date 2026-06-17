import * as React from 'react'
import { currentSession, logout } from './lib/api'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'

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
        <LoginPage onSuccess={() => setIsAuthed(true)} />
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
