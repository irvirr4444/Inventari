import { COUNTRY_META } from '../../lib/country'
import { countryHistoryLabel } from '../../lib/format'
import type { ActionBatch } from '../../lib/api'

export { EditIcon, DeleteIcon } from '../../components/icons'

export function LlojiBadge(props: { lloji: ActionBatch['lloji'] }) {
  if (props.lloji === 'Hyrje') {
    return (
      <span className="history-pill history-pill-hyrje">
        <span aria-hidden="true">↑</span> Hyrje
      </span>
    )
  }
  if (props.lloji === 'Dalje') {
    return (
      <span className="history-pill history-pill-dalje">
        <span aria-hidden="true">↑</span> Dalje
      </span>
    )
  }
  return (
    <span className="history-pill history-pill-transfer">
      <span aria-hidden="true">⇌</span> Transfer
    </span>
  )
}

export function CountryCell(props: { action: ActionBatch }) {
  if (props.action.lloji === 'Transfer' && props.action.destination_shteti) {
    const from = COUNTRY_META[props.action.shteti]
    const to = COUNTRY_META[props.action.destination_shteti]
    return (
      <span className="history-country">
        <img className="flagIcon" src={from.flagSrc} alt="" />
        <span>{countryHistoryLabel(props.action.shteti)}</span>
        <span className="history-country-arrow">→</span>
        <span>{countryHistoryLabel(props.action.destination_shteti)}</span>
        <img className="flagIcon" src={to.flagSrc} alt="" />
      </span>
    )
  }

  const meta = COUNTRY_META[props.action.shteti]
  return (
    <span className="history-country">
      <img className="flagIcon" src={meta.flagSrc} alt="" />
      <span>{countryHistoryLabel(props.action.shteti)}</span>
    </span>
  )
}
