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
import { OnboardingWizard } from './features/onboarding/OnboardingWizard'
import { LocationsSettingsPage } from './features/settings/LocationsSettingsPage'
import { DynamicDashboardPage } from './features/dynamic/DynamicDashboardPage'
import { DynamicMobileApp } from './features/dynamic/mobile/DynamicMobileApp'
import { MobileApp } from './mobile/MobileApp.tsx'
import { shouldShowOnboarding, shouldShowTutorial } from './lib/auth/postAuthRedirect'
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

function DynamicDashboardShell(props: {
  isMobile: boolean
  onLogout: () => void
  showTutorial?: boolean
}) {
  if (props.isMobile) {
    return (
      <DynamicMobileApp onLogout={props.onLogout} showTutorial={props.showTutorial} />
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
        <DynamicDashboardPage showTutorial={props.showTutorial} />
      </main>
    </div>
  )
}

function ProtectedHome() {
  const isMobile = useMobileClient()
  const { user, logout } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (shouldShowOnboarding(user)) {
    return <Navigate to="/onboarding" replace />
  }

  const handleLogout = async () => {
    await logout()
  }

  const showTutorial = shouldShowTutorial(user)

  if (user.uiLloji === 'legacy_fixed') {
    return <LegacyDashboardShell isMobile={isMobile} onLogout={handleLogout} />
  }

  return (
    <DynamicDashboardShell
      isMobile={isMobile}
      onLogout={handleLogout}
      showTutorial={showTutorial}
    />
  )
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
          path="/onboarding"
          element={
            <RequireAuth>
              <OnboardingWizard />
            </RequireAuth>
          }
        />
        <Route path="/onboarding/locations" element={<Navigate to="/onboarding" replace />} />
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
