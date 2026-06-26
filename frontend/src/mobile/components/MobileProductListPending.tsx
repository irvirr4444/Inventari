export function MobileProductListPending(props: { count?: number; variant?: 'dynamic' | 'legacy' }) {
  const count = props.count ?? 5
  const variant = props.variant ?? 'dynamic'

  return (
    <div
      className={`mobile-product-list-pending mobile-product-list-pending--${variant}`}
      aria-busy="true"
      aria-label="Duke ngarkuar produktet"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="mobile-product-list-pending-card mobile-pending-surface"
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <span className="mobile-pending-line mobile-pending-line--product-title" />
          <div className="mobile-product-list-pending-chips" aria-hidden="true">
            <span className="mobile-pending-chip" />
            <span className="mobile-pending-chip" />
            {variant === 'dynamic' ? <span className="mobile-pending-chip mobile-pending-chip--short" /> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
