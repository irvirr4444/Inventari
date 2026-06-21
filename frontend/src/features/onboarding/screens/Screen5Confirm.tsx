import type { LocationDraft } from './Screen3LocationNames'

export function Screen5Confirm(props: {
  locations: LocationDraft[]
  trackPrice: boolean
  onSubmit: () => void
  submitting?: boolean
  error?: string | null
}) {
  const names = props.locations.map((l) => l.emri.trim()).filter(Boolean)
  const pricingLabel = props.trackPrice ? '💰 Me çmime' : '📦 Vetëm sasi'

  return (
    <div className="onboarding-wizard__screen">
      <h1 className="ob-headline">Gati. Ja çfarë konfiguruat:</h1>
      <div className="ob-summary-block">
        <p className="ob-summary-block__label">
          📍 {names.length} {names.length === 1 ? 'vendodhje' : 'vendodhje'}
        </p>
        <p className="ob-summary-block__detail">{names.join(' · ')}</p>
      </div>
      <div className="ob-summary-block">
        <p className="ob-summary-block__label">{pricingLabel}</p>
      </div>
      {props.error ? <p className="ob-error">{props.error}</p> : null}
      <div className="ob-cta-wrap">
        <button
          type="button"
          className="ob-cta"
          disabled={props.submitting}
          onClick={props.onSubmit}
        >
          {props.submitting ? 'Duke krijuar…' : 'Fillo të punosh →'}
        </button>
      </div>
    </div>
  )
}
