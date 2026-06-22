export function Screen1Welcome(props: { onContinue: () => void; onLogout: () => void }) {
  return (
    <div className="onboarding-wizard__screen onboarding-wizard__screen--0">
      <div className="onboarding-orb onboarding-orb--a" aria-hidden="true" />
      <div className="onboarding-orb onboarding-orb--b" aria-hidden="true" />
      <div className="onboarding-welcome">
        <div className="onboarding-brand-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </div>
        <div className="onboarding-eyebrow">Mirë se erdhe</div>
        <h1 className="onboarding-screen-title">
          Mirë se erdhe.
          <br />
          <span style={{ color: '#3b82f6' }}>Inventari</span> është gati të
          <br />
          fillojë të punojë për ty.
        </h1>
        <p className="onboarding-welcome-sub">Do të duhen 2 minuta për ta konfiguruar.</p>
        <div className="onboarding-stats-row">
          <div className="onboarding-stat-chip">
            <span className="onboarding-stat-num">3</span>
            <span className="onboarding-stat-label">hapa</span>
          </div>
          <div className="onboarding-stat-chip">
            <span className="onboarding-stat-num">1</span>
            <span className="onboarding-stat-label">Minutë</span>
          </div>
          <div className="onboarding-stat-chip">
            <span className="onboarding-stat-num">∞</span>
            <span className="onboarding-stat-label">magazina</span>
          </div>
        </div>
        <div className="onboarding-spacer" />
        <button type="button" className="onboarding-cta" onClick={props.onContinue}>
          Fillo
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
        <button type="button" className="onboarding-back-to-login" onClick={props.onLogout}>
          Kthehu te hyrja
        </button>
      </div>
    </div>
  )
}
