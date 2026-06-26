import type { CountrySummary as CountrySummaryData } from '@inventari/shared'
import { useSummaryDateRange } from '../../../../hooks/useSummaryQuery'
import { useTenantConfig } from '../../../../hooks/useTenantConfig'
import { exportUrl } from '../../../../lib/api'
import { fmt, fmtInt } from '../../../../lib/format'
import { queryRefreshState } from '../../../../lib/queryRefreshState'
import { useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { MobileDateRangeInput } from '../../../../mobile/components/MobileDateRangeInput'
import { MobileSummaryListPending } from '../../../../mobile/components/MobileSummaryListPending'

function LocationSummaryCard(props: {
  emoji: string
  name: string
  summary: CountrySummaryData
  trackPrice: boolean
}) {
  return (
    <article className="dynamic-mobile-summary-card">
      <header className="dynamic-mobile-summary-card-head">
        <span className="dynamic-mobile-summary-card-emoji" aria-hidden="true">
          {props.emoji}
        </span>
        <span className="dynamic-mobile-summary-card-name">{props.name}</span>
      </header>
      <div className="dynamic-mobile-summary-card-grid">
        <div className="dynamic-mobile-summary-stat dynamic-mobile-summary-stat--in">
          <span className="dynamic-mobile-summary-stat-label">Hyrje</span>
          <span className="dynamic-mobile-summary-stat-qty mobile-num">
            {fmtInt(props.summary.in_qty)}
          </span>
          {props.trackPrice ? (
            <span className="dynamic-mobile-summary-stat-value mobile-num">
              {fmt(props.summary.in_value)} €
            </span>
          ) : null}
        </div>
        <div className="dynamic-mobile-summary-stat dynamic-mobile-summary-stat--out">
          <span className="dynamic-mobile-summary-stat-label">Dalje</span>
          <span className="dynamic-mobile-summary-stat-qty mobile-num">
            {fmtInt(props.summary.out_qty)}
          </span>
          {props.trackPrice ? (
            <span className="dynamic-mobile-summary-stat-value mobile-num">
              {fmt(props.summary.out_value)} €
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function DynamicPermbledhjeTab() {
  const { trackPrice } = useTenantConfig()
  const { from, setFrom, to, setTo, query, emptySummary } = useSummaryDateRange()
  const { activeLokacionet } = useLokacioni()
  const summaryLocations = activeLokacionet
    .filter((l) => l.show_in_summary)
    .sort((a, b) => a.rradhitja - b.rradhitja)

  const { isInitialLoad, isRefreshing } = queryRefreshState(query)
  const summaryData = (query.data ?? {}) as Record<string, CountrySummaryData>
  const scrollableList = summaryLocations.length > 6

  return (
    <div className="mobile-tab-panel mobile-tab-panel--action dynamic-permbledhje-panel">
      <div className="mobile-field-row mobile-field-row--date-range dynamic-permbledhje-dates">
        <MobileDateRangeInput
          from={from}
          to={to}
          onRangeChange={(nextFrom, nextTo) => {
            setFrom(nextFrom)
            setTo(nextTo)
          }}
          fromPlaceholder="Nga"
          toPlaceholder="Deri"
        />
      </div>

      {query.error ? (
        <div className="mobile-inline-error">
          {query.error instanceof Error ? query.error.message : 'Nuk u lexua permbledhja.'}
        </div>
      ) : null}

      {summaryLocations.length === 0 ? (
        <div className="mobile-empty">
          <div className="mobile-empty-title">Nuk ka lokacione te shfaqura ne permbledhje.</div>
        </div>
      ) : isInitialLoad ? (
        <MobileSummaryListPending count={Math.min(summaryLocations.length, 6)} />
      ) : (
        <div
          className={`dynamic-mobile-summary-list mobile-panel-enter${scrollableList ? ' dynamic-mobile-summary-list--scrollable' : ''}${isRefreshing ? ' is-refreshing' : ''}`}
        >
          {summaryLocations.map((loc) => (
            <LocationSummaryCard
              key={loc.id}
              emoji={loc.flag_emoji ?? '📍'}
              name={loc.emri}
              summary={summaryData[loc.id] ?? emptySummary}
              trackPrice={trackPrice}
            />
          ))}
        </div>
      )}

      <a
        className="mobile-btn-outline dynamic-permbledhje-export"
        href={exportUrl('xlsx', { from, to })}
      >
        Shkarko Excel
      </a>
    </div>
  )
}
