import { fmtInt } from '../../../../lib/format'
import type { Lokacioni } from '../../../../lib/lokacioni/types'

function StockStatChip(props: { loc: Lokacioni; qty: number }) {
  const { loc, qty } = props
  return (
    <span
      className={`dynamic-mobile-stock-stat-chip${qty === 0 ? ' dynamic-mobile-stock-stat-chip--zero' : ''}`}
    >
      <span className="dynamic-mobile-stock-stat-chip-emoji" aria-hidden="true">
        {loc.flag_emoji ?? '📍'}
      </span>
      <span className="dynamic-mobile-stock-stat-chip-name">{loc.emri}</span>
      <span className="dynamic-mobile-stock-stat-chip-qty">{fmtInt(qty)}</span>
    </span>
  )
}

export function DynamicMobileStockLevels(props: {
  locations: Lokacioni[]
  stock: Record<string, number>
}) {
  const { locations, stock } = props
  if (locations.length === 0) return null

  return (
    <div className="dynamic-mobile-stock-stat-chips">
      {locations.map((loc) => (
        <StockStatChip key={loc.id} loc={loc} qty={stock[loc.id] ?? 0} />
      ))}
    </div>
  )
}
