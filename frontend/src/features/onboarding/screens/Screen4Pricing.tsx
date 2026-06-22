export function Screen4Pricing(props: {
  value: boolean | null
  onChange: (trackPrice: boolean) => void
  onContinue: () => void
  loading?: boolean
}) {
  return (
    <div className="onboarding-wizard__screen onboarding-wizard__screen--3">
      <div className="onboarding-orb onboarding-orb--a" aria-hidden="true" />
      <div className="onboarding-orb onboarding-orb--b" aria-hidden="true" />
      <div className="onboarding-content">
        <h1 className="onboarding-screen-title">Si e menaxhoni çmimin e produkteve?</h1>
        <button
          type="button"
          className={`onboarding-pricing-card${props.value === true ? ' selected' : ''}`}
          onClick={() => props.onChange(true)}
        >
          <div className="onboarding-pricing-card__icon">
            <svg
              width="22"
              height="22"
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
          </div>
          <div className="onboarding-pricing-card__check">
            {props.value === true ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : null}
          </div>
          <div className="onboarding-pricing-card__title">Me çmime</div>
          <div className="onboarding-pricing-card__desc">
            Regjistroni çmim për njësi dhe shihni totalin e vlerës për çdo lëvizje.
          </div>
        </button>
        <button
          type="button"
          className={`onboarding-pricing-card${props.value === false ? ' selected' : ''}`}
          onClick={() => props.onChange(false)}
        >
          <div className="onboarding-pricing-card__icon">
            <svg
              width="22"
              height="22"
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
          </div>
          <div className="onboarding-pricing-card__check">
            {props.value === false ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : null}
          </div>
          <div className="onboarding-pricing-card__title">Vetëm sasi</div>
          <div className="onboarding-pricing-card__desc">
            Gjurmoni vetëm sasitë. Pa çmime, pa totale. I thjeshtë dhe i shpejtë.
          </div>
        </button>
        <div className="onboarding-spacer" />
        <button
          type="button"
          className="onboarding-cta"
          disabled={props.value === null || props.loading}
          onClick={props.onContinue}
        >
          {props.loading ? 'Duke ruajtur…' : 'Vazhdo →'}
        </button>
      </div>
    </div>
  )
}
