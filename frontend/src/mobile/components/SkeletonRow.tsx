export function SkeletonRow(props: { count?: number }) {
  const n = props.count ?? 1
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="mobile-skeleton" aria-hidden="true" />
      ))}
    </>
  )
}
