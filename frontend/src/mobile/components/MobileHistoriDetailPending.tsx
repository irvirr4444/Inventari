export function MobileHistoriDetailPending() {
  return (
    <div
      className="mobile-tab-panel dynamic-histori-detail-panel mobile-histori-detail-pending"
      aria-busy="true"
      aria-label="Duke ngarkuar detajet"
    >
      <div className="dynamic-histori-detail-section">
        <div className="dynamic-histori-detail-section-head">
          <div className="mobile-pending-line mobile-pending-line--section" />
          <div className="mobile-pending-icon-pair" aria-hidden="true">
            <span className="mobile-pending-icon" />
            <span className="mobile-pending-icon" />
          </div>
        </div>

        <div className="mobile-histori-detail-pending-card mobile-pending-surface" style={{ animationDelay: '0.05s' }}>
          <div className="mobile-histori-detail-pending-card-head">
            <span className="mobile-pending-pill" />
            <span className="mobile-pending-line mobile-pending-line--date" />
          </div>
          <span className="mobile-pending-line mobile-pending-line--route" />
          <span className="mobile-pending-line mobile-pending-line--footer" />
        </div>
      </div>

      <div className="dynamic-histori-detail-section">
        <div className="mobile-pending-line mobile-pending-line--section" />
        {[0, 1].map((i) => (
          <div
            key={i}
            className="mobile-histori-detail-pending-product mobile-pending-surface"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="mobile-histori-detail-pending-product-body">
              <span className="mobile-pending-line mobile-pending-line--title" />
              <span className="mobile-pending-line mobile-pending-line--sub" />
              <span className="mobile-pending-line mobile-pending-line--total" />
            </div>
            <div className="mobile-pending-icon-pair" aria-hidden="true">
              <span className="mobile-pending-icon" />
              <span className="mobile-pending-icon" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
