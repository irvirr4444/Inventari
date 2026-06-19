import { DynamicDashboardPage } from '../DynamicDashboardPage'

export function DynamicMobileApp(props: { onLogout: () => void }) {
  return (
    <div className="mobile-app">
      <header className="mobile-header">
        <span className="mobile-header-title">Inventari</span>
        <button type="button" className="mobile-header-logout" onClick={props.onLogout}>
          Dil
        </button>
      </header>
      <main className="mobile-content">
        <DynamicDashboardPage />
      </main>
    </div>
  )
}
