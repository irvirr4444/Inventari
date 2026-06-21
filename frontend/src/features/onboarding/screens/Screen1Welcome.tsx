export function Screen1Welcome(props: { onContinue: () => void }) {
  return (
    <div className="onboarding-wizard__screen">
      <h1 className="ob-headline">
        Mirë se erdhe.
        <br />
        Inventari është gati të
        <br />
        fillojë të punojë për ty.
      </h1>
      <p className="ob-subtext">Do të duhen 2 minuta për ta konfiguruar.</p>
      <div className="ob-cta-wrap">
        <button type="button" className="ob-cta" onClick={props.onContinue}>
          Fillo →
        </button>
      </div>
    </div>
  )
}
