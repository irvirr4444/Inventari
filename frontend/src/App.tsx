import * as React from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAuth } from './lib/auth/AuthProvider'
import { useMobileClient } from './hooks/useMobileClient'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { LocationsOnboardingPage } from './features/onboarding/LocationsOnboardingPage'
import { LocationsSettingsPage } from './features/settings/LocationsSettingsPage'
import { DynamicDashboardPage } from './features/dynamic/DynamicDashboardPage'
import { DynamicMobileApp } from './features/dynamic/mobile/DynamicMobileApp'
import { MobileApp } from './mobile/MobileApp.tsx'
import './mobile/styles/mobile.css'

function AuthLoading() {
  return (
    <main className="container auth-container">
      <section className="card auth-card">
        <h1>Inventari</h1>
        <p className="muted">Duke kontrolluar sesionin...</p>
      </section>
    </main>
  )
}

function LegacyDashboardShell(props: { isMobile: boolean; onLogout: () => void }) {
  if (props.isMobile) {
    return (
      <ErrorBoundary fallbackClassName="mobile-auth-loading">
        <MobileApp onLogout={props.onLogout} />
      </ErrorBoundary>
    )
  }

  return (
    <div>
      <div className="app-actions">
        <button type="button" className="btn" onClick={props.onLogout}>
          Dil
        </button>
      </div>
      <main className="container">
        <DashboardPage />
      </main>
    </div>
  )
}

function DynamicDashboardShell(props: { isMobile: boolean; onLogout: () => void }) {
  if (props.isMobile) {
    return <DynamicMobileApp onLogout={props.onLogout} />
  }

  return (
    <div>
      <div className="app-actions">
        <button type="button" className="btn" onClick={props.onLogout}>
          Dil
        </button>
      </div>
      <main className="container">
        <DynamicDashboardPage />
      </main>
    </div>
  )
}

function ProtectedHome() {
  const isMobile = useMobileClient()
  const { user, logout } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (!user.isLegacy && !user.has_locations) {
    return <Navigate to="/onboarding/locations" replace />
  }

  const handleLogout = async () => {
    await logout()
  }

  if (user.uiLloji === 'legacy_fixed') {
    return <LegacyDashboardShell isMobile={isMobile} onLogout={handleLogout} />
  }

  return <DynamicDashboardShell isMobile={isMobile} onLogout={handleLogout} />
}

function PublicOnly(props: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (user) return <Navigate to="/" replace />
  return <>{props.children}</>
}

function RequireAuth(props: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  return <>{props.children}</>
}

function LoginRoute() {
  return (
    <main className="container auth-container">
      <LoginPage />
    </main>
  )
}

function MobileRedirect() {
  const location = useLocation()
  const target = location.pathname.replace(/^\/mobile\/?/, '/') || '/'
  return <Navigate to={target + location.search + location.hash} replace />
}

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return <AuthLoading />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginRoute />
            </PublicOnly>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnly>
              <Navigate to="/login?mode=signup" replace />
            </PublicOnly>
          }
        />
        <Route
          path="/onboarding/locations"
          element={
            <RequireAuth>
              <LocationsOnboardingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/locations"
          element={
            <RequireAuth>
              <LocationsSettingsPage />
            </RequireAuth>
          }
        />
        <Route path="/" element={<ProtectedHome />} />
        <Route path="/mobile/*" element={<MobileRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
