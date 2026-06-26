export function HistoryFilterRangeError(props: { message?: string }) {
  if (!props.message) return null
  return (
    <p className="history-filter-range-error" role="alert">
      {props.message}
    </p>
  )
}
