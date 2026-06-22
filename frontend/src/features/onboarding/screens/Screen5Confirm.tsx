import type { LocationDraft } from './Screen3LocationNames'

export function Screen5Confirm(props: {
  locations: LocationDraft[]
  trackPrice: boolean
  onSubmit: () => void
  submitting?: boolean
  error?: string | null
}) {
  const pricingLabel = props.trackPrice ? '💰 Me çmime' : '📦 Vetëm sasi'
  const locationSummary = props.locations
    .filter((l) => l.emri.trim())
    .map((l) => `${l.flagEmoji} ${l.emri.trim()}`)
    .join(' · ')

  return (
    <div className="onboarding-wizard__screen onboarding-wizard__screen--4">
      <div className="onboarding-orb onboarding-orb--a" aria-hidden="true" />
      <div className="onboarding-orb onboarding-orb--b" aria-hidden="true" />
      <div className="onboarding-content">
        <div className="onboarding-success-ring">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="onboarding-confirm-title">Gati për të nisur</h2>
        <p className="onboarding-confirm-sub">Kontrolloni detajet përpara se të filloni</p>
        <div className="onboarding-confirm-rows">
          <div className="onboarding-confirm-row">
            <div className="onboarding-confirm-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <div className="onboarding-confirm-label">Vendodhje</div>
              <div className="onboarding-confirm-value">{locationSummary}</div>
            </div>
          </div>
          <div className="onboarding-confirm-row">
            <div className="onboarding-confirm-icon">
              {props.trackPrice ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 0 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              )}
            </div>
            <div>
              <div className="onboarding-confirm-label">Mënyra</div>
              <div className="onboarding-confirm-value">{pricingLabel}</div>
            </div>
          </div>
        </div>
        {props.error ? <p className="ob-error">{props.error}</p> : null}
        <div className="onboarding-spacer" />
        <button
          type="button"
          className="onboarding-cta onboarding-cta--final"
          disabled={props.submitting}
          onClick={props.onSubmit}
        >
          {props.submitting ? 'Duke krijuar…' : 'Fillo të punosh →'}
        </button>
      </div>
    </div>
  )
}
