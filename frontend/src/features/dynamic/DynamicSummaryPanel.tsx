import type { GroupedSummaryRow } from '@inventari/shared'
import { DateRangeInput } from '../../components/DateRangeInput'
import { ErrorAlert } from '../../components/ErrorAlert'
import { DownloadIcon } from '../../components/icons'
import { exportUrl } from '../../lib/api'
import { fmt, fmtInt } from '../../lib/format'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { locationBadge } from '../../lib/lokacioni/LokacioniProvider'
import { useTenantConfig } from '../../hooks/useTenantConfig'
import { SummaryGroupByControl } from '../summary/SummaryGroupByControl'
import type { SummaryGroupBy } from '@inventari/shared'

function SummaryMiniCard(props: {
  tone: 'success' | 'danger'
  label: string
  quantity: number
  value: number
  showPrice: boolean
}) {
  return (
    <div className={`summary-card compact ${props.tone}`}>
      <div className="summary-label">{props.label}</div>
      <div className="summary-value">{fmtInt(props.quantity)}</div>
      {props.showPrice ? <div className="summary-sub">{fmt(props.value)} €</div> : null}
    </div>
  )
}

function GroupSummaryCard(props: {
  row: GroupedSummaryRow
  showPrice: boolean
  leading?: React.ReactNode
}) {
  return (
    <section className="summary-country">
      <div className="summary-country-title">
        {props.leading}
        <span>{props.row.label}</span>
      </div>
      <div className="summary-mini-grid">
        <SummaryMiniCard
          tone="success"
          label="Hyrje (sasi)"
          quantity={props.row.in_qty}
          value={props.row.in_value}
          showPrice={props.showPrice}
        />
        <SummaryMiniCard
          tone="danger"
          label="Dalje (sasi)"
          quantity={props.row.out_qty}
          value={props.row.out_value}
          showPrice={props.showPrice}
        />
      </div>
    </section>
  )
}

export function DynamicSummaryPanel(props: {
  from: string
  to: string
  onFromChange: (date: string) => void
  onToChange: (date: string) => void
  groupBy: SummaryGroupBy
  onGroupByChange: (groupBy: SummaryGroupBy) => void
  locations: Lokacioni[]
  rows: GroupedSummaryRow[]
  loading?: boolean
  error: unknown
}) {
  const { trackPrice } = useTenantConfig()
  const useTable = props.rows.length >= 3
  const locationById = new Map(props.locations.map((loc) => [loc.id, loc]))

  return (
    <div className="card summary-panel summary-panel-dynamic" data-tutorial="summary-panel">
      <div className="row summary-header">
        <h3>Përmbledhje</h3>
        <div className="spacer" />
        <SummaryGroupByControl value={props.groupBy} onChange={props.onGroupByChange} />
        <a
          className="btn sm"
          href={exportUrl('xlsx', { from: props.from, to: props.to, groupBy: props.groupBy })}
          title="Shkarko Excel"
        >
          <DownloadIcon />
          Excel
        </a>
      </div>

      <div className="summary-period">
        <label className="label">Periudha</label>
        <DateRangeInput
          from={props.from}
          to={props.to}
          onRangeChange={(from, to) => {
            props.onFromChange(from)
            props.onToChange(to)
          }}
        />
      </div>

      {props.error != null && (
        <ErrorAlert
          message={
            props.error instanceof Error ? props.error.message : 'Nuk u lexua permbledhja.'
          }
          style={{ marginBottom: 12, padding: '10px 14px', fontSize: 13 }}
        />
      )}

      <div className="summary-panel-scroll">
        {props.loading ? (
          <div className="summary-panel-pending" aria-busy="true" aria-label="Duke ngarkuar permbledhjen">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="summary-panel-pending-row" />
            ))}
          </div>
        ) : props.rows.length === 0 ? (
          <div className="muted" style={{ padding: '12px 4px' }}>
            Nuk ka te dhena per kete periudhe.
          </div>
        ) : useTable ? (
          <div className="dynamic-summary-table-wrap">
            <table className="table dynamic-summary-table">
              <thead>
                <tr>
                  <th>
                    {props.groupBy === 'location'
                      ? 'Vendndodhja'
                      : props.groupBy === 'product'
                        ? 'Produkti'
                        : 'Përdoruesi'}
                  </th>
                  <th>Hyrje (sasi)</th>
                  <th>Dalje (sasi)</th>
                </tr>
              </thead>
              <tbody>
                {props.rows.map((row) => {
                  const loc = props.groupBy === 'location' ? locationById.get(row.id) : undefined
                  return (
                    <tr key={row.id}>
                      <td>
                        <span className="row" style={{ gap: 6 }}>
                          {loc ? locationBadge(loc) : null}
                          {row.label}
                        </span>
                      </td>
                      <td className="num">
                        {fmtInt(row.in_qty)}
                        {trackPrice ? (
                          <span className="muted"> ({fmt(row.in_value)} €)</span>
                        ) : null}
                      </td>
                      <td className="num">
                        {fmtInt(row.out_qty)}
                        {trackPrice ? (
                          <span className="muted"> ({fmt(row.out_value)} €)</span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="summary-countries dynamic-summary-grid">
            {props.rows.map((row) => {
              const loc = props.groupBy === 'location' ? locationById.get(row.id) : undefined
              return (
                <GroupSummaryCard
                  key={row.id}
                  row={row}
                  showPrice={trackPrice}
                  leading={loc ? locationBadge(loc) : undefined}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
