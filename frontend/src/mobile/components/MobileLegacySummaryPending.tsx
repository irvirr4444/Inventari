export function MobileLegacySummaryPending() {
  return (
    <div className="mobile-legacy-summary-pending" aria-busy="true" aria-label="Duke ngarkuar permbledhjen">
      {[0, 1].map((i) => (
        <section
          key={i}
          className="mobile-legacy-summary-pending-card mobile-pending-surface"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <div className="mobile-legacy-summary-pending-head">
            <span className="mobile-pending-line mobile-pending-line--flag" />
            <span className="mobile-pending-line mobile-pending-line--country" />
          </div>
          <div className="mobile-legacy-summary-pending-rows" aria-hidden="true">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="mobile-legacy-summary-pending-row">
                <span className="mobile-pending-line mobile-pending-line--summary-label" />
                <span className="mobile-pending-line mobile-pending-line--summary-value" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
