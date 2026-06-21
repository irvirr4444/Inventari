const MIN = 1
const MAX = 20

export function Screen2LocationCount(props: {
  value: number
  onChange: (value: number) => void
  onContinue: () => void
}) {
  const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n))

  return (
    <div className="onboarding-wizard__screen">
      <h1 className="ob-headline">
        Sa vendodhje (vende magazinimi) dispononi?
      </h1>
      <div className="ob-count-control">
        <button
          type="button"
          className="ob-count-btn"
          aria-label="Zvogelo"
          disabled={props.value <= MIN}
          onClick={() => props.onChange(clamp(props.value - 1))}
        >
          −
        </button>
        <input
          type="number"
          className="ob-count-value"
          min={MIN}
          max={MAX}
          value={props.value}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10)
            if (Number.isNaN(parsed)) return
            props.onChange(clamp(parsed))
          }}
          aria-label="Numri i vendodhjeve"
        />
        <button
          type="button"
          className="ob-count-btn"
          aria-label="Rrit"
          disabled={props.value >= MAX}
          onClick={() => props.onChange(clamp(props.value + 1))}
        >
          +
        </button>
      </div>
      <p className="ob-subtext">
        Mund të jenë magazina, dyqane, depo, ose çdo vend tjetër.
      </p>
      <div className="ob-cta-wrap">
        <button
          type="button"
          className="ob-cta"
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
