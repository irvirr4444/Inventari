import type { CountrySummary as CountrySummaryData } from '@inventari/shared'
import type { Country } from '../../lib/country'
import { fmt, fmtInt } from '../../lib/format'

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

export function CountrySummary(props: {
  country: Country
  name: string
  flagSrc: string
  summary: CountrySummaryData
}) {
  return (
    <section className="summary-country">
      <div className="summary-country-title">
        <img className="flagIcon" src={props.flagSrc} alt={props.country} />
        <span>{props.name}</span>
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
