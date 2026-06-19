export const HISTORY_TABLE_COL_COUNT = 9

export function HistorySkeletonTable() {
  return (
    <tbody>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="history-skeleton-row">
          <td colSpan={HISTORY_TABLE_COL_COUNT}>
            <div className="history-skeleton-block" />
          </td>
        </tr>
      ))}
    </tbody>
  )
}
