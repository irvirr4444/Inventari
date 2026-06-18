import * as React from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { currentSession, logout } from './lib/api'
import { useMobileClient } from './hooks/useMobileClient'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { MobileApp } from './mobile/MobileApp.tsx'
import './mobile/styles/mobile.css'

function AuthGate(props: { isMobile: boolean }) {
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
      <main className={props.isMobile ? 'mobile-auth-loading' : 'container auth-container'}>
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
      <main className={props.isMobile ? 'mobile-auth-loading' : 'container auth-container'}>
        <LoginPage onSuccess={() => setIsAuthed(true)} />
      </main>
    )
  }

  const handleLogout = async () => {
    await logout().catch(() => undefined)
    setIsAuthed(false)
  }

  if (props.isMobile) {
    return (
      <ErrorBoundary fallbackClassName="mobile-auth-loading">
        <MobileApp onLogout={handleLogout} />
      </ErrorBoundary>
    )
  }

  return (
    <div>
      <div className="app-actions">
        <button type="button" className="btn" onClick={handleLogout}>
          Dil
        </button>
      </div>
      <main className="container">
        <DashboardPage />
      </main>
    </div>
  )
}

function HomeRoute() {
  const isMobile = useMobileClient()
  return <AuthGate isMobile={isMobile} />
}

function MobileRedirect() {
  const location = useLocation()
  const target = location.pathname.replace(/^\/mobile\/?/, '/') || '/'
  return <Navigate to={target + location.search + location.hash} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/mobile/*" element={<MobileRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
