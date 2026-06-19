import type { ActionBatch } from '../../lib/api'
import { formatDisplayDate } from '../../lib/format'
import { formatDisplayTime } from '../../lib/actionMeta'
import { isLegacyBatchId } from '../../lib/actionBatch'

export function HistoryBatchMetaDisplay(props: { batch: ActionBatch }) {
  const isLegacy = isLegacyBatchId(props.batch.id)
  const ora = isLegacy ? '' : formatDisplayTime(props.batch.ora)
  const pershkrimi = isLegacy ? '' : (props.batch.pershkrimi ?? '').trim()

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
      </td>
    </>
  )
}
