import type { ProductListItem } from '../../lib/api'
import { fmt } from '../../lib/format'
import type { ActionItemDraft } from '../../types/actionItem'
import { effectiveSasia } from '../../types/actionItem'
import { NumericInput } from '../../components/NumericInput'
import { ProductSearchSelect } from '../../components/ProductSearchSelect'
import { HoverTooltip } from '../../components/HoverTooltip'
import { ActionItemShenim } from './ActionItemShenim'

const ACTION_VISIBLE_ROWS = 2

function resolveColumnWidths(showPrice: boolean) {
  if (showPrice) return ['35%', '20%', '15%', '18%', '12%'] as const
  return ['55%', '30%', '15%'] as const
}

function ActionTableColgroup(props: { widths: readonly string[] }) {
  return (
    <colgroup>
      {props.widths.map((width, i) => (
        <col key={i} style={{ width }} />
      ))}
    </colgroup>
  )
}

export function ActionItemsTable(props: {
  items: ActionItemDraft[]
  products: ProductListItem[]
  onUpdate: (key: string, field: keyof ActionItemDraft, value: string | number) => void
  onRemove: (key: string) => void
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
  showPrice?: boolean
}) {
  const showPrice = props.showPrice ?? true
  const columnWidths = resolveColumnWidths(showPrice)
  const showScrollHint = props.items.length > ACTION_VISIBLE_ROWS
  const padRowCount =
    props.items.length <= ACTION_VISIBLE_ROWS
      ? ACTION_VISIBLE_ROWS - props.items.length
      : 0
  const colSpan = showPrice ? 5 : 3

  return (
    <div className="action-table-wrap">
      <div className="action-table-hscroll table-scroll">
        <div className="action-table-inner">
          <table className="table table-fixed action-table action-table-head">
            <ActionTableColgroup widths={columnWidths} />
            <thead>
              <tr>
                <th>Produkti</th>
                {showPrice ? <th>Cmimi/Njesi</th> : null}
                <th>Sasia</th>
                {showPrice ? <th style={{ textAlign: 'right' }}>Totali</th> : null}
                <th />
              </tr>
            </thead>
          </table>
          <div
            className={`action-rows-scroll${showScrollHint ? '' : ' action-rows-scroll--fit'}`}
          >
            <table className="table table-fixed action-table action-table-body">
              <ActionTableColgroup widths={columnWidths} />
              <tbody>
                {props.items.map((it) => {
                  const lineTotal = (Number(it.cmimi_njesi) || 0) * effectiveSasia(it.sasia)

                  return (
                    <tr key={it.key}>
                      <td>
                        <ProductSearchSelect
                          products={props.products}
                          value={it.kodi_produktit}
                          onChange={(kodi) => props.onUpdate(it.key, 'kodi_produktit', kodi)}
                          placeholder="Kerko sipas kodit ose emrit…"
                        />
                      </td>
                      {showPrice ? (
                        <td>
                          <NumericInput
                            className="input"
                            step="0.01"
                            min={0}
                            clearable
                            value={it.cmimi_njesi}
                            onChange={(v) => props.onUpdate(it.key, 'cmimi_njesi', v)}
                            placeholder="0.00"
                            style={{ width: '100%' }}
                          />
                        </td>
                      ) : null}
                      <td>
                        <NumericInput
                          className="input"
                          min={1}
                          clearable
                          value={it.sasia}
                          onChange={(v) => props.onUpdate(it.key, 'sasia', v)}
                          placeholder="1"
                          style={{ width: '100%' }}
                        />
                      </td>
                      {showPrice ? (
                        <td style={{ textAlign: 'right' }}>
                          <span className="num">{fmt(lineTotal)}</span>
                        </td>
                      ) : null}
                      <td className="action-table-actions-cell">
                        <div className="action-row-actions">
                          <ActionItemShenim
                            value={it.shenim}
                            onChange={(value) => props.onUpdate(it.key, 'shenim', value)}
                            onNotify={props.onNotify}
                          />
                          <HoverTooltip
                            label={
                              props.items.length <= 1
                                ? 'Duhet te kesh te pakten 1 produkt'
                                : 'Hiq produktin'
                            }
                          >
                            <button
                              type="button"
                              className="btn ghost sm action-row-remove-btn"
                              onClick={() => props.onRemove(it.key)}
                              disabled={props.items.length <= 1}
                              aria-label="Hiq produktin nga veprimi"
                            >
                              ×
                            </button>
                          </HoverTooltip>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {Array.from({ length: padRowCount }).map((_, i) => (
                  <tr key={`action-pad-${i}`} className="action-table-pad-row" aria-hidden="true">
                    <td colSpan={colSpan} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            className={`action-rows-scroll-hint${showScrollHint ? '' : ' is-hidden'}`}
            aria-live="polite"
            aria-hidden={!showScrollHint}
          >
            {showScrollHint
              ? `↕ ${props.items.length} produkte — scroll për të parë të gjitha`
              : null}
          </p>
        </div>
      </div>
    </div>
  )
}
