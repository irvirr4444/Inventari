import type { CountrySummary as CountrySummaryData } from '@inventari/shared'
import { DateRangeInput } from '../../components/DateRangeInput'
import { ErrorAlert } from '../../components/ErrorAlert'
import { exportUrl } from '../../lib/api'
import { CountrySummary } from './CountrySummary'

const emptySummary: CountrySummaryData = {
  in_qty: 0,
  in_value: 0,
  out_qty: 0,
  out_value: 0,
}

export function SummaryPanel(props: {
  from: string
  to: string
  onFromChange: (date: string) => void
  onToChange: (date: string) => void
  summaryKosove: CountrySummaryData
  summaryShqiperi: CountrySummaryData
  isFetching: boolean
  error: unknown
}) {
  return (
    <div className="card summary-panel">
      <div className="row summary-header">
        <h3>Permbledhje</h3>
        <div className="spacer" />
        {props.isFetching && (
          <span className="muted" style={{ fontSize: 12 }}>
            Duke rifreskuar...
          </span>
        )}
        <a
          className="btn sm"
          href={exportUrl('xlsx', { from: props.from, to: props.to })}
          title="Shkarko Excel"
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
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

      <div className="summary-countries">
        <CountrySummary
          country="XK"
          name="Kosovo"
          flagSrc="/Flag_of_Kosovo.webp"
          summary={props.summaryKosove ?? emptySummary}
        />
        <CountrySummary
          country="AL"
          name="Albania"
          flagSrc="/Flag_of_Albania.svg"
          summary={props.summaryShqiperi ?? emptySummary}
        />
      </div>
    </div>
  )
}
