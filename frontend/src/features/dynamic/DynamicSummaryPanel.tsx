import type { CountrySummary as CountrySummaryData } from '@inventari/shared'
import { DateRangeInput } from '../../components/DateRangeInput'
import { ErrorAlert } from '../../components/ErrorAlert'
import { DownloadIcon } from '../../components/icons'
import { exportUrl } from '../../lib/api'
import { fmt, fmtInt } from '../../lib/format'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { locationBadge } from '../../lib/lokacioni/LokacioniProvider'
import { useTenantConfig } from '../../hooks/useTenantConfig'

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

function LocationSummaryCard(props: {
  location: Lokacioni
  summary: CountrySummaryData
  showPrice: boolean
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
          label="Hyrje (sasi)"
          quantity={props.summary.in_qty}
          value={props.summary.in_value}
          showPrice={props.showPrice}
        />
        <SummaryMiniCard
          tone="danger"
          label="Dalje (sasi)"
          quantity={props.summary.out_qty}
          value={props.summary.out_value}
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
  locations: Lokacioni[]
  summaryByLocation: Record<string, CountrySummaryData>
  isFetching: boolean
  error: unknown
}) {
  const { trackPrice } = useTenantConfig()
  const useTable = props.locations.length > 3

  return (
    <div className="card summary-panel summary-panel-dynamic" data-tutorial="summary-panel">
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
        {useTable ? (
          <div className="dynamic-summary-table-wrap">
            <table className="table dynamic-summary-table">
              <thead>
                <tr>
                  <th>Lokacioni</th>
                  <th>Hyrje (sasi)</th>
                  <th>Dalje (sasi)</th>
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
                        {fmtInt(s.in_qty)}
                        {trackPrice ? (
                          <span className="muted"> ({fmt(s.in_value)} €)</span>
                        ) : null}
                      </td>
                      <td className="num">
                        {fmtInt(s.out_qty)}
                        {trackPrice ? (
                          <span className="muted"> ({fmt(s.out_value)} €)</span>
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
            {props.locations.map((loc) => (
              <LocationSummaryCard
                key={loc.id}
                location={loc}
                summary={props.summaryByLocation[loc.id] ?? emptySummary}
                showPrice={trackPrice}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
