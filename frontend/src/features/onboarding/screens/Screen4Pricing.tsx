export function Screen4Pricing(props: {
  value: boolean | null
  onChange: (trackPrice: boolean) => void
  onContinue: () => void
  loading?: boolean
}) {
  return (
    <div className="onboarding-wizard__screen">
      <h1 className="ob-headline">Si e menaxhoni çmimin e produkteve?</h1>
      <div className="ob-pricing-cards">
        <button
          type="button"
          className={`ob-pricing-card${props.value === true ? ' ob-pricing-card--selected' : ''}`}
          onClick={() => props.onChange(true)}
        >
          <p className="ob-pricing-card__title">Me çmime</p>
          <p className="ob-pricing-card__desc">
            Regjistroni çmim për njësi dhe shihni totalin e vlerës për çdo lëvizje.
          </p>
        </button>
        <button
          type="button"
          className={`ob-pricing-card${props.value === false ? ' ob-pricing-card--selected' : ''}`}
          onClick={() => props.onChange(false)}
        >
          <p className="ob-pricing-card__title">Vetëm sasi</p>
          <p className="ob-pricing-card__desc">
            Gjurmoni vetëm sasitë. Pa çmime, pa totale. I thjeshtë dhe i shpejtë.
          </p>
        </button>
      </div>
      <div className="ob-cta-wrap">
        <button
          type="button"
          className="ob-cta"
          disabled={props.value === null || props.loading}
          onClick={props.onContinue}
        >
          {props.loading ? 'Duke ruajtur…' : 'Vazhdo →'}
        </button>
      </div>
    </div>
  )
}
