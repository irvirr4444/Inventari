import { HISTORY_MODAL_PAGE_SIZE } from './historyTableLayout'

export const HISTORY_TABLE_COL_COUNT = 9

export function HistorySkeletonTable() {
  return (
    <tbody className="history-table-pending">
      {Array.from({ length: HISTORY_MODAL_PAGE_SIZE }).map((_, i) => (
        <tr key={i} className="history-skeleton-row" style={{ animationDelay: `${i * 0.04}s` }}>
          <td className="history-col-expand">
            <span className="history-pending-dot" aria-hidden="true" />
          </td>
          <td>
            <span className="history-pending-line history-pending-line--date" />
          </td>
          <td>
            <span className="history-pending-line history-pending-line--ora" />
          </td>
          <td>
            <span className="history-pending-line history-pending-line--pershkrimi" />
          </td>
          <td>
            <span className="history-pending-line history-pending-line--badge" />
          </td>
          <td>
            <span className="history-pending-line history-pending-line--shteti" />
          </td>
          <td>
            <span className="history-pending-line history-pending-line--products" />
          </td>
          <td>
            <span className="history-pending-line history-pending-line--total" />
          </td>
          <td>
            <span className="history-pending-line history-pending-line--actions" />
          </td>
        </tr>
      ))}
    </tbody>
  )
}
