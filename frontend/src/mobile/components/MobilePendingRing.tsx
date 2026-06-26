export function MobilePendingRing(props: { glow?: boolean; className?: string }) {
  return (
    <div
      className={[
        'mobile-pending-ring',
        props.glow ? 'mobile-pending-ring--glow' : '',
        props.className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    />
  )
}
