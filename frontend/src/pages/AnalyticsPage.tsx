import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsSummary, exportUrl } from '../lib/api'
import { useCountry } from '../lib/country'

function isoDateDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function AnalyticsPage() {
  const { country } = useCountry()
  const [from, setFrom] = React.useState(() => isoDateDaysAgo(30))
  const [to, setTo] = React.useState(() => isoDateDaysAgo(0))

  const summaryQuery = useQuery({
    queryKey: ['analytics-summary', country, from, to],
    queryFn: () => analyticsSummary({ shteti: country, from, to }),
  })

  const summary = summaryQuery.data ?? { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 }

  return (
    <div className="card">
      <div className="row">
        <h2 style={{ margin: 0 }}>Analytics</h2>
        <div className="spacer" />
        <label className="row" style={{ gap: 8 }}>
          <span className="muted">From</span>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="row" style={{ gap: 8 }}>
          <span className="muted">To</span>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <div style={{ height: 12 }} />

      <div className="row">
        <div className="card" style={{ flex: 1, background: '#fafafa' }}>
          <div className="muted">Total Hyrje (IN)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.in_qty}</div>
          <div className="muted">Spent: {summary.in_value.toFixed(2)}</div>
        </div>
        <div className="card" style={{ flex: 1, background: '#fafafa' }}>
          <div className="muted">Total Dalje (OUT)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.out_qty}</div>
          <div className="muted">Got: {summary.out_value.toFixed(2)}</div>
        </div>
        <div className="card" style={{ width: 280, background: '#fafafa' }}>
          <div className="muted">Exports</div>
          <div className="row" style={{ marginTop: 8 }}>
            <a className="btn" href={exportUrl('csv', { shteti: country, from, to })}>
              CSV
            </a>
            <a className="btn" href={exportUrl('xlsx', { shteti: country, from, to })}>
              Excel
            </a>
          </div>
        </div>
      </div>

      {summaryQuery.isError ? (
        <div style={{ marginTop: 10, color: '#b91c1c' }}>
          <strong>Error:</strong> {summaryQuery.error instanceof Error ? summaryQuery.error.message : 'Error'}
        </div>
      ) : null}
    </div>
  )
}

