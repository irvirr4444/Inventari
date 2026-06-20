import { fmtInt } from '../../../../lib/format'
import type { Lokacioni } from '../../../../lib/lokacioni/types'

export function DynamicMobileStockLevels(props: {
  locations: Lokacioni[]
  stock: Record<string, number>
  expanded?: boolean
  onToggleExpand?: () => void
}) {
  const { locations, stock } = props
  const count = locations.length

  if (count === 0) return null

  if (count <= 3) {
    const parts = locations.map((loc) => `${loc.emri}: ${fmtInt(stock[loc.id] ?? 0)}`)
    return (
      <div className="mobile-card-meta dynamic-mobile-stock-inline">
        {parts.join(' · ')}
      </div>
    )
  }

  if (!props.expanded) {
    return (
      <button
        type="button"
        className="dynamic-mobile-stock-chip"
        onClick={(e) => {
          e.stopPropagation()
          props.onToggleExpand?.()
        }}
      >
        {count} lokacione — Shiko gjendjen →
      </button>
    )
  }

  return (
    <div className="mobile-stock-levels dynamic-mobile-stock-expanded">
      {locations.map((loc) => {
        const qty = stock[loc.id] ?? 0
        return (
          <span key={loc.id} className="mobile-stock-level">
            <span className="mobile-stock-country">{loc.flag_emoji ?? '📍'} {loc.emri}</span>
            <span
              className={`mobile-stock-num mobile-num${qty === 0 ? ' mobile-stock-low' : ''}`}
            >
              {fmtInt(qty)}
            </span>
          </span>
        )
      })}
      {props.onToggleExpand ? (
        <button type="button" className="mobile-btn-outline sm" onClick={props.onToggleExpand}>
          Mbyll
        </button>
      ) : null}
    </div>
  )
}
