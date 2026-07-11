import { fmtEuro, fmtInt, productLabel } from '../../lib/format'
import type { ActionBatchDetail } from '../../lib/api'
import { highlightMatch, shenimContainsTerm } from '../../lib/highlightMatch'

export function ActionReadOnlyPanel(props: {
  detail: ActionBatchDetail
  highlightShenim?: string
}) {
  const total = props.detail.items.reduce((sum, it) => sum + it.totali, 0)
  const highlightShenim = props.highlightShenim?.trim() || undefined

  return (
    <div className="history-expanded-panel">
      <table className="table table-fixed history-subtable">
        <colgroup>
          <col className="history-subtable-col-product" />
          <col className="history-subtable-col-shenim" />
          <col className="history-subtable-col-price" />
          <col className="history-subtable-col-qty" />
          <col className="history-subtable-col-total" />
        </colgroup>
        <thead>
          <tr>
            <th>Produkti</th>
            <th className="history-subtable-text">Shënim</th>
            <th className="history-subtable-money">Cmimi/Njësi</th>
            <th className="history-subtable-qty">Sasia</th>
            <th className="history-subtable-money">Totali</th>
          </tr>
        </thead>
        <tbody>
          {props.detail.items.map((item) => {
            const showHighlight =
              highlightShenim && shenimContainsTerm(item.shenim, highlightShenim)
            const shenimText = (item.shenim ?? '').trim()

            return (
              <tr key={item.id}>
                <td className="history-subtable-text">
                  <span
                    className="history-subtable-text-cell"
                    title={productLabel(item.emri_produktit, item.kodi_produktit)}
                  >
                    {productLabel(item.emri_produktit, item.kodi_produktit)}
                  </span>
                </td>
                <td className="history-subtable-text">
                  {shenimText ? (
                    <span className="history-subtable-text-cell" title={shenimText}>
                      {showHighlight
                        ? highlightMatch(shenimText, highlightShenim)
                        : shenimText}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="history-subtable-money">
                  <span className="num">{fmtEuro(item.cmimi_njesi)}</span>
                </td>
                <td className="history-subtable-qty">
                  <span className="num">{fmtInt(item.sasia)}</span>
                </td>
                <td className="history-subtable-money">
                  <span className="num">{fmtEuro(item.totali)}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="history-expanded-total">
        Totali i veprimit: <strong>{fmtEuro(total)}</strong>
      </div>
    </div>
  )
}
