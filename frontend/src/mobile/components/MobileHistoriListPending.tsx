import { MobilePendingRing } from './MobilePendingRing'

export function MobileHistoriListPending(props: { variant: 'initial' | 'overlay' }) {
  if (props.variant === 'initial') {
    return (
      <div className="mobile-histori-list-pending mobile-histori-list-pending--initial" aria-busy="true">
        <MobilePendingRing />
      </div>
    )
  }

  return (
    <div className="mobile-histori-list-pending mobile-histori-list-pending--overlay" aria-hidden="true">
      <div className="mobile-histori-list-pending-shade" />
      <MobilePendingRing glow />
    </div>
  )
}
