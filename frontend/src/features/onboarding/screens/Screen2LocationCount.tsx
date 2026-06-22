const MIN = 1
const MAX = 20

export function Screen2LocationCount(props: {
  value: number
  onChange: (value: number) => void
  onContinue: () => void
}) {
  const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n))

  return (
    <div className="onboarding-wizard__screen onboarding-wizard__screen--1">
      <div className="onboarding-orb onboarding-orb--a" aria-hidden="true" />
      <div className="onboarding-orb onboarding-orb--b" aria-hidden="true" />
      <div className="onboarding-content">
        <h1 className="onboarding-screen-title">
          Sa vendodhje (vende magazinimi) dispononi?
        </h1>
        <div className="onboarding-counter-row">
          <button
            type="button"
            className="onboarding-counter-btn"
            aria-label="Zvogelo"
            disabled={props.value <= MIN}
            onClick={() => props.onChange(clamp(props.value - 1))}
          >
            −
          </button>
          <div className="onboarding-counter-num">{props.value}</div>
          <button
            type="button"
            className="onboarding-counter-btn"
            aria-label="Rrit"
            disabled={props.value >= MAX}
            onClick={() => props.onChange(clamp(props.value + 1))}
          >
            +
          </button>
        </div>
        <div className="onboarding-counter-hint">
          {props.value === 1 ? '1 vendodhje' : `${props.value} vendodhje`}
        </div>
        <p className="onboarding-screen-sub">
          Mund të jenë magazina, dyqane, depo, ose çdo vend tjetër.
        </p>
        <div className="onboarding-spacer" />
        <button
          type="button"
          className="onboarding-cta"
          disabled={props.value < MIN}
          onClick={props.onContinue}
        >
          Vazhdo →
        </button>
      </div>
    </div>
  )
}

export { MIN as LOCATION_COUNT_MIN, MAX as LOCATION_COUNT_MAX }
