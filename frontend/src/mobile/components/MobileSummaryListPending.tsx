export function MobileSummaryListPending(props: { count?: number }) {
  const count = props.count ?? 3

  return (
    <div className="mobile-summary-list-pending" aria-busy="true" aria-label="Duke ngarkuar permbledhjen">
      {Array.from({ length: count }, (_, i) => (
        <article
          key={i}
          className="mobile-summary-list-pending-card mobile-pending-surface"
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <header className="mobile-summary-list-pending-head">
            <span className="mobile-pending-line mobile-pending-line--emoji" />
            <span className="mobile-pending-line mobile-pending-line--summary-name" />
          </header>
          <div className="mobile-summary-list-pending-grid" aria-hidden="true">
            <div className="mobile-summary-list-pending-stat mobile-pending-surface--nested" />
            <div className="mobile-summary-list-pending-stat mobile-pending-surface--nested" />
          </div>
        </article>
      ))}
    </div>
  )
}
