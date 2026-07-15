import * as React from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthLoading } from './components/AuthLoading'
import { UserMenu } from './components/UserMenu'
import { SettingsModal, type SettingsTab } from './features/settings/SettingsModal'
import { useAuth } from './lib/auth/AuthProvider'
import { isAdmin } from './lib/permissions'
import { useMobileClient } from './hooks/useMobileClient'
import { isCapacitorNativeApp } from './lib/capacitorClient'
import { shouldShowOnboarding, shouldShowTutorial } from './lib/auth/postAuthRedirect'

const LoginPage = React.lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const OnboardingWizard = React.lazy(() =>
  import('./features/onboarding/OnboardingWizard').then((m) => ({ default: m.OnboardingWizard })),
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
const HistoryPrintPage = React.lazy(() =>
  import('./features/history/HistoryPrintPage').then((m) => ({ default: m.HistoryPrintPage })),
)
const PrivacyPolicyPage = React.lazy(() =>
  import('./pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })),
)
const TermsPage = React.lazy(() =>
  import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })),
)
const LandingPage = React.lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })),
)

function RouteSuspense(props: { children: React.ReactNode }) {
  return <React.Suspense fallback={<AuthLoading />}>{props.children}</React.Suspense>
}

function PublicRouteSuspense(props: { children: React.ReactNode }) {
  return (
    <React.Suspense
      fallback={
        <div className="public-route-fallback" aria-busy="true" aria-live="polite">
          <div className="public-route-fallback__card" />
        </div>
      }
    >
      {props.children}
    </React.Suspense>
  )
}

function LegacyDashboardShell(props: {
  isMobile: boolean
  onLogout: () => void
  user: NonNullable<ReturnType<typeof useAuth>['user']>
}) {
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
      <div className="desktop-shell">
        <div className="app-actions">
          <UserMenu user={props.user} onOpenSettings={() => {}} onLogout={props.onLogout} />
        </div>
        <main className="container">
          <DashboardPage />
        </main>
      </div>
    </RouteSuspense>
  )
}

type OpenSettingsState = { openSettings?: SettingsTab }

function DynamicDashboardShell(props: {
  isMobile: boolean
  onLogout: () => void
  showTutorial?: boolean
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  initialSettingsTab?: SettingsTab
}) {
  const admin = isAdmin(props.user)
  const [settingsOpen, setSettingsOpen] = React.useState(Boolean(props.initialSettingsTab))
  const [settingsTab, setSettingsTab] = React.useState<SettingsTab>(
    props.initialSettingsTab ?? 'users',
  )

  const openSettings = React.useCallback((tab: SettingsTab) => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }, [])

  React.useEffect(() => {
    const closeOverlays = () => setSettingsOpen(false)
    window.addEventListener('inventari:close-overlays', closeOverlays)
    return () => window.removeEventListener('inventari:close-overlays', closeOverlays)
  }, [])

  if (props.isMobile) {
    return (
      <RouteSuspense>
        <DynamicMobileApp onLogout={props.onLogout} showTutorial={props.showTutorial} />
      </RouteSuspense>
    )
  }

  return (
    <RouteSuspense>
      <div className="desktop-shell">
        <div className="app-actions">
          <UserMenu
            user={props.user}
            onOpenSettings={openSettings}
            onLogout={props.onLogout}
          />
        </div>
        <main className="container">
          <DynamicDashboardPage showTutorial={props.showTutorial} />
        </main>
        {admin ? (
          <SettingsModal
            open={settingsOpen}
            tab={settingsTab}
            onTabChange={setSettingsTab}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
      </div>
    </RouteSuspense>
  )
}

function ProtectedHome() {
  const isMobile = useMobileClient()
  const location = useLocation()
  const { user, logout, loading, waking } = useAuth()
  const initialSettingsTab = (location.state as OpenSettingsState | null)?.openSettings

  if ((loading || waking) && !user) {
    if (!waking && (isCapacitorNativeApp() || isMobile)) {
      return <Navigate to="/login" replace />
    }
    return <AuthLoading waking={waking} />
  }

  if (!user) return <Navigate to="/login" replace />
  if (shouldShowOnboarding(user)) {
    return <Navigate to="/onboarding" replace />
  }

  const handleLogout = async () => {
    await logout()
  }

  const showTutorial = shouldShowTutorial(user)

  if (user.uiLloji === 'legacy_fixed') {
    return (
      <LegacyDashboardShell isMobile={isMobile} onLogout={handleLogout} user={user} />
    )
  }

  return (
    <DynamicDashboardShell
      isMobile={isMobile}
      onLogout={handleLogout}
      showTutorial={showTutorial}
      user={user}
      initialSettingsTab={initialSettingsTab}
    />
  )
}

function OpenSettingsRedirect(props: { tab: SettingsTab }) {
  return <Navigate to="/app" replace state={{ openSettings: props.tab }} />
}

function PublicOnly(props: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/app" replace />
  return <>{props.children}</>
}

function RequireAuth(props: { children: React.ReactNode }) {
  const { user, loading, waking } = useAuth()
  // Only block on waking when we don't already have a session.
  if (loading || (waking && !user)) return <AuthLoading waking={waking} />
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

function LandingRoute() {
  return (
    <PublicRouteSuspense>
      <LandingPage />
    </PublicRouteSuspense>
  )
}

function LegalRoute(props: { children: React.ReactNode }) {
  return <PublicRouteSuspense>{props.children}</PublicRouteSuspense>
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
        <Route path="/" element={<LandingRoute />} />
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
          path="/settings/users"
          element={
            <RequireAuth>
              <OpenSettingsRedirect tab="users" />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/locations"
          element={
            <RequireAuth>
              <OpenSettingsRedirect tab="locations" />
            </RequireAuth>
          }
        />
        <Route
          path="/history/print"
          element={
            <RequireAuth>
              <RouteSuspense>
                <HistoryPrintPage />
              </RouteSuspense>
            </RequireAuth>
          }
        />
        <Route
          path="/privacy"
          element={
            <LegalRoute>
              <PrivacyPolicyPage />
            </LegalRoute>
          }
        />
        <Route
          path="/terms"
          element={
            <LegalRoute>
              <TermsPage />
            </LegalRoute>
          }
        />
        <Route path="/app" element={<ProtectedHome />} />
        <Route path="/mobile/*" element={<MobileRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
