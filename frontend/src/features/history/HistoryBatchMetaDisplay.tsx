import type { ActionBatch } from '../../lib/api'
import { formatDisplayDate } from '../../lib/format'
import { formatDisplayTime } from '../../lib/actionMeta'

export function HistoryBatchMetaDisplay(props: {
  batch: ActionBatch
  matchedItems?: ActionBatch['matched_items']
}) {
  const ora = formatDisplayTime(props.batch.ora)
  const pershkrimi = (props.batch.pershkrimi ?? '').trim()
  const matchedItems = props.matchedItems

  return (
    <>
      <td className="history-col-date">{formatDisplayDate(props.batch.data)}</td>
      <td className="history-col-ora">{ora || <span className="muted">—</span>}</td>
      <td className="history-col-pershkrimi">
        {pershkrimi ? (
          <span className="history-pershkrimi-text" title={pershkrimi}>
            {pershkrimi}
          </span>
        ) : (
          <span className="muted">—</span>
        )}
        {matchedItems && matchedItems.length > 0 ? (
          <div
            className="history-shenim-preview"
            title={
              matchedItems.length === 1
                ? `"${matchedItems[0].shenim}" — ${matchedItems[0].productLabel}`
                : matchedItems.map((m) => `"${m.shenim}" — ${m.productLabel}`).join('\n')
            }
          >
            {matchedItems.length === 1 ? (
              <>
                📝 &quot;{matchedItems[0].shenim}&quot; — {matchedItems[0].productLabel}
              </>
            ) : (
              <>
                📝 &quot;{matchedItems[0].shenim}&quot; — {matchedItems[0].productLabel} +
                {matchedItems.length - 1} të tjera
              </>
            )}
          </div>
        ) : null}
      </td>
    </>
  )
}
