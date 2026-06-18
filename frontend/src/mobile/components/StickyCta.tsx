export function StickyCta(props: {
  label: string
  disabled?: boolean
  loading?: boolean
  onClick: () => void
}) {
  return (
    <div className="mobile-sticky-cta-wrap">
      <button
        type="button"
        className="mobile-sticky-cta"
        disabled={props.disabled || props.loading}
        onClick={props.onClick}
      >
        {props.loading ? 'Duke finalizuar…' : props.label}
      </button>
    </div>
  )
}
