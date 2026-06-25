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
import { shouldShowOnboarding, shouldShowTutorial } from './lib/auth/postAuthRedirect'

const LoginPage = React.lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const OnboardingWizard = React.lazy(() =>
  import('./features/onboarding/OnboardingWizard').then((m) => ({ default: m.OnboardingWizard })),
)
const LocationsSettingsPage = React.lazy(() =>
  import('./features/settings/LocationsSettingsPage').then((m) => ({
    default: m.LocationsSettingsPage,
  })),
)
const DashboardPage = React.lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const DynamicDashboardPage = React.lazy(() =>
  import('./features/dynamic/DynamicDashboardPage').then((m) => ({
    default: m.DynamicDashboardPage,
  })),
)
const MobileApp = React.lazy(() =>
  import('./mobile/MobileApp').then((m) => ({ default: m.MobileApp })),
)
const DynamicMobileApp = React.lazy(() =>
  import('./features/dynamic/mobile/DynamicMobileApp').then((m) => ({
    default: m.DynamicMobileApp,
  })),
)

function RouteSuspense(props: { children: React.ReactNode }) {
  return <React.Suspense fallback={<AuthLoading />}>{props.children}</React.Suspense>
}

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
      <RouteSuspense>
        <ErrorBoundary fallbackClassName="mobile-auth-loading">
          <MobileApp onLogout={props.onLogout} />
        </ErrorBoundary>
      </RouteSuspense>
    )
  }

  return (
    <RouteSuspense>
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
    </RouteSuspense>
  )
}

function DynamicDashboardShell(props: {
  isMobile: boolean
  onLogout: () => void
  showTutorial?: boolean
}) {
  if (props.isMobile) {
    return (
      <RouteSuspense>
        <DynamicMobileApp onLogout={props.onLogout} showTutorial={props.showTutorial} />
      </RouteSuspense>
    )
  }

  return (
    <RouteSuspense>
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
    </RouteSuspense>
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
    <RouteSuspense>
      <main className="container auth-container">
        <LoginPage />
      </main>
    </RouteSuspense>
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
              <RouteSuspense>
                <OnboardingWizard />
              </RouteSuspense>
            </RequireAuth>
          }
        />
        <Route path="/onboarding/locations" element={<Navigate to="/onboarding" replace />} />
        <Route
          path="/settings/locations"
          element={
            <RequireAuth>
              <RouteSuspense>
                <LocationsSettingsPage />
              </RouteSuspense>
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
