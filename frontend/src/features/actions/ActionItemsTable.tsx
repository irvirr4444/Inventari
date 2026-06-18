import type { Produkti } from '../../lib/api'
import { fmt } from '../../lib/format'
import type { ActionItemDraft } from '../../types/actionItem'
import { NumericInput } from '../../components/NumericInput'
import { ProductSearchSelect } from '../../components/ProductSearchSelect'

export function ActionItemsTable(props: {
  items: ActionItemDraft[]
  products: Produkti[]
  onUpdate: (key: string, field: keyof ActionItemDraft, value: string | number) => void
  onRemove: (key: string) => void
}) {
  return (
    <div className="table-scroll action-table-wrap">
      <table className="table table-fixed action-table">
        <colgroup>
          <col style={{ width: '35%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Produkti</th>
            <th>Cmimi/Njesi</th>
            <th>Sasia</th>
            <th style={{ textAlign: 'right' }}>Totali</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {props.items.map((it) => {
            const lineTotal = (Number(it.cmimi_njesi) || 0) * (Number(it.sasia) || 0)
            return (
              <tr key={it.key}>
                <td>
                  <ProductSearchSelect
                    products={props.products}
                    value={it.kodi_produktit}
                    onChange={(kodi) => props.onUpdate(it.key, 'kodi_produktit', kodi)}
                    disabledKodis={props.items
                      .filter((x) => x.key !== it.key && x.kodi_produktit)
                      .map((x) => x.kodi_produktit)}
                    placeholder="Kerko sipas kodit ose emrit…"
                  />
                </td>
                <td>
                  <NumericInput
                    className="input"
                    step="0.01"
                    min={0}
                    value={it.cmimi_njesi}
                    onChange={(v) => props.onUpdate(it.key, 'cmimi_njesi', v)}
                    placeholder="0.00"
                    style={{ width: '100%' }}
                  />
                </td>
                <td>
                  <NumericInput
                    className="input"
                    min={1}
                    value={it.sasia}
                    onChange={(v) => props.onUpdate(it.key, 'sasia', v)}
                    placeholder="1"
                    style={{ width: '100%' }}
                  />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="num">{fmt(lineTotal)}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => props.onRemove(it.key)}
                    disabled={props.items.length <= 1}
                    aria-label="Fshij produktin nga veprimi"
                    title={props.items.length <= 1 ? 'Duhet te kesh te pakten 1 produkt' : 'Fshij'}
                    style={{ fontSize: 22, lineHeight: 1, padding: '4px 10px' }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
