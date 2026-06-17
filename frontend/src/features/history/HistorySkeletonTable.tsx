export function HistorySkeletonTable() {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="history-skeleton-row">
          <td colSpan={7}>
            <div className="history-skeleton-block" />
          </td>
        </tr>
      ))}
    </tbody>
  )
}
