export function HistoryDetailPending() {
  return (
    <div className="history-detail-pending" aria-busy="true" aria-label="Duke ngarkuar detajet">
      <div className="history-detail-pending-meta">
        <span className="history-pending-line history-pending-line--wide" />
        <span className="history-pending-line history-pending-line--medium" />
      </div>
      <div className="history-detail-pending-rows">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="history-detail-pending-row history-pending-surface"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <span className="history-pending-line history-pending-line--product" />
            <span className="history-pending-line history-pending-line--qty" />
            <span className="history-pending-line history-pending-line--qty" />
          </div>
        ))}
      </div>
    </div>
  )
}
