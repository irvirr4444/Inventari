import { fmtEuro, productLabel } from '../../lib/format'
import type { ActionBatchDetail } from '../../lib/api'

export function ActionReadOnlyPanel(props: { detail: ActionBatchDetail }) {
  const total = props.detail.items.reduce((sum, it) => sum + it.totali, 0)
  return (
    <div className="history-expanded-panel">
      <table className="table table-fixed history-subtable">
        <colgroup>
          <col style={{ width: '38%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '28%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Produkti</th>
            <th className="history-subtable-money">Cmimi/Njesi</th>
            <th className="history-subtable-qty">Sasia</th>
            <th className="history-subtable-money">Totali</th>
          </tr>
        </thead>
        <tbody>
          {props.detail.items.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="history-product-cell">
                  {productLabel(item.emri_produktit, item.kodi_produktit)}
                </span>
              </td>
              <td className="history-subtable-money">{fmtEuro(item.cmimi_njesi)}</td>
              <td className="history-subtable-qty">{item.sasia}</td>
              <td className="history-subtable-money">
                <span className="num">{fmtEuro(item.totali)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="history-expanded-total">
        Totali i veprimit: <strong>{fmtEuro(total)}</strong>
      </div>
    </div>
  )
}
