import type { CountrySummary as CountrySummaryData } from '@inventari/shared'
import { DateInput } from '../../components/DateInput'
import { ErrorAlert } from '../../components/ErrorAlert'
import { exportUrl } from '../../lib/api'
import { fmt, fmtInt } from '../../lib/format'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { locationBadge } from '../../lib/lokacioni/LokacioniProvider'

const emptySummary: CountrySummaryData = {
  in_qty: 0,
  in_value: 0,
  out_qty: 0,
  out_value: 0,
}

function SummaryMiniCard(props: {
  tone: 'success' | 'danger'
  label: string
  quantity: number
  value: number
}) {
  return (
    <div className={`summary-card compact ${props.tone}`}>
      <div className="summary-label">{props.label}</div>
      <div className="summary-value">{fmtInt(props.quantity)}</div>
      <div className="summary-sub">{fmt(props.value)} €</div>
    </div>
  )
}

function LocationSummaryCard(props: {
  location: Lokacioni
  summary: CountrySummaryData
}) {
  return (
    <section className="summary-country">
      <div className="summary-country-title">
        <span>{locationBadge(props.location)}</span>
        <span>{props.location.emri}</span>
      </div>
      <div className="summary-mini-grid">
        <SummaryMiniCard
          tone="success"
          label="Hyrje"
          quantity={props.summary.in_qty}
          value={props.summary.in_value}
        />
        <SummaryMiniCard
          tone="danger"
          label="Dalje"
          quantity={props.summary.out_qty}
          value={props.summary.out_value}
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
  locations: Lokacioni[]
  summaryByLocation: Record<string, CountrySummaryData>
  isFetching: boolean
  error: unknown
}) {
  const useTable = props.locations.length > 3

  return (
    <div className="card summary-panel summary-panel-dynamic">
      <div className="row summary-header">
        <h3>Permbledhje</h3>
        <div className="spacer" />
        {props.isFetching && (
          <span className="muted" style={{ fontSize: 12 }}>Duke rifreskuar...</span>
        )}
        <a
          className="btn sm"
          href={exportUrl('xlsx', { from: props.from, to: props.to })}
          title="Shkarko Excel"
        >
          Excel
        </a>
      </div>

      <div className="summary-period">
        <label className="label">Periudha</label>
        <div className="form-row-equal summary-date-grid">
          <div className="form-group">
            <span className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Nga</span>
            <DateInput value={props.from} onChange={props.onFromChange} style={{ width: '100%' }} />
          </div>
          <div className="form-group">
            <span className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Deri</span>
            <DateInput value={props.to} onChange={props.onToChange} style={{ width: '100%' }} />
          </div>
        </div>
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
        {useTable ? (
          <div className="dynamic-summary-table-wrap">
            <table className="table dynamic-summary-table">
              <thead>
                <tr>
                  <th>Lokacioni</th>
                  <th>Hyrje</th>
                  <th>Dalje</th>
                </tr>
              </thead>
              <tbody>
                {props.locations.map((loc) => {
                  const s = props.summaryByLocation[loc.id] ?? emptySummary
                  return (
                    <tr key={loc.id}>
                      <td>
                        <span className="row" style={{ gap: 6 }}>
                          {locationBadge(loc)} {loc.emri}
                        </span>
                      </td>
                      <td className="num">
                        {fmtInt(s.in_qty)} <span className="muted">({fmt(s.in_value)} €)</span>
                      </td>
                      <td className="num">
                        {fmtInt(s.out_qty)} <span className="muted">({fmt(s.out_value)} €)</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="summary-countries dynamic-summary-grid">
            {props.locations.map((loc) => (
              <LocationSummaryCard
                key={loc.id}
                location={loc}
                summary={props.summaryByLocation[loc.id] ?? emptySummary}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
