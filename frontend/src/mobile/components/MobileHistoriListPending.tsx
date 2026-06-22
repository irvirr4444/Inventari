export function MobileHistoriListPending(props: { variant: 'initial' | 'overlay' }) {
  if (props.variant === 'initial') {
    return (
      <div className="mobile-histori-list-pending mobile-histori-list-pending--initial" aria-busy="true">
        <div className="mobile-histori-list-pending-ring" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="mobile-histori-list-pending mobile-histori-list-pending--overlay" aria-hidden="true">
      <div className="mobile-histori-list-pending-shade" />
      <div className="mobile-histori-list-pending-ring" />
    </div>
  )
}
