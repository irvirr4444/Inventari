import type { ActionBatchDetail } from '../../lib/api'
import { fmtEuro, fmtInt, formatDisplayDate, productLabel } from '../../lib/format'
import { formatDisplayTime } from '../../lib/actionMeta'

function routeLabel(detail: ActionBatchDetail): string | null {
  if (detail.lloji === 'Transfer') {
    const from = detail.lokacioni_emri ?? detail.shteti
    const to = detail.destination_lokacioni_emri ?? detail.destination_shteti
    if (from && to) return `${from} → ${to}`
  }
  if (detail.lokacioni_emri) return detail.lokacioni_emri
  if (detail.shteti === 'XK') return 'Kosova'
  if (detail.shteti === 'AL') return 'Shqiperi'
  return null
}

export function HistoryPrintActionCard(props: {
  detail: ActionBatchDetail
  trackPrice: boolean
}) {
  const { detail, trackPrice } = props
  const ora = formatDisplayTime(detail.ora)
  const pershkrimi = (detail.pershkrimi ?? '').trim()
  const route = routeLabel(detail)
  const total = detail.items.reduce((sum, item) => sum + item.totali, 0)
  const badgeClass =
    detail.lloji === 'Hyrje'
      ? 'history-print-card-badge--hyrje'
      : detail.lloji === 'Dalje'
        ? 'history-print-card-badge--dalje'
        : 'history-print-card-badge--transfer'

  return (
    <article className="history-print-card">
      <header className="history-print-card-header">
        <div className="history-print-card-meta">
          <div className="history-print-card-date">
            {formatDisplayDate(detail.data)}
            {ora ? ` · ${ora}` : ''}
          </div>
          {route ? <div className="history-print-card-route">{route}</div> : null}
          {pershkrimi ? (
            <div className="history-print-card-pershkrimi">{pershkrimi}</div>
          ) : null}
        </div>
        <span className={`history-print-card-badge ${badgeClass}`}>{detail.lloji}</span>
      </header>

      <div className="history-print-card-body">
        {detail.items.map((item) => (
          <div key={item.id} className="history-print-item">
            <div className="history-print-item-name">
              {productLabel(item.emri_produktit, item.kodi_produktit)}
              {item.shenim?.trim() ? (
                <span className="history-print-item-shenim">{item.shenim.trim()}</span>
              ) : null}
            </div>
            <div className="history-print-item-qty">{fmtInt(item.sasia)} copë</div>
            {trackPrice ? (
              <div className="history-print-item-total">{fmtEuro(item.totali)}</div>
            ) : null}
          </div>
        ))}
      </div>

      {trackPrice ? (
        <footer className="history-print-card-footer">
          <span>
            Totali: <strong>{fmtEuro(total)}</strong>
          </span>
        </footer>
      ) : null}
    </article>
  )
}
