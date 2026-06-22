export const HISTORY_MODAL_PAGE_SIZE = 8

export function HistoryTablePadRows(props: { count: number; colSpan: number }) {
  if (props.count <= 0) return null

  return (
    <>
      {Array.from({ length: props.count }, (_, i) => (
        <tr key={`history-pad-${i}`} className="history-table-pad-row" aria-hidden="true">
          <td colSpan={props.colSpan} />
        </tr>
      ))}
    </>
  )
}

export function HistoryTableEmptyBody(props: {
  message: string
  colSpan: number
}) {
  return (
    <tbody>
      <tr className="history-table-empty-message-row">
        <td colSpan={props.colSpan} className="history-empty-cell">
          <p className="muted">{props.message}</p>
        </td>
      </tr>
      <HistoryTablePadRows
        count={HISTORY_MODAL_PAGE_SIZE - 1}
        colSpan={props.colSpan}
      />
    </tbody>
  )
}
