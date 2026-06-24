import type { CountrySummary as CountrySummaryData } from '@inventari/shared'
import { useSummaryDateRange } from '../../../../hooks/useSummaryQuery'
import { useTenantConfig } from '../../../../hooks/useTenantConfig'
import { exportUrl } from '../../../../lib/api'
import { fmt, fmtInt } from '../../../../lib/format'
import { useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { MobileDateInput } from '../../../../mobile/components/MobileDateInput'
import { SkeletonRow } from '../../../../mobile/components/SkeletonRow'

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

  const loading = query.isLoading || query.isFetching
  const summaryData = (query.data ?? {}) as Record<string, CountrySummaryData>
  const scrollableList = summaryLocations.length > 6

  return (
    <div className="mobile-tab-panel dynamic-permbledhje-panel">
      <div className="mobile-field-row dynamic-permbledhje-dates">
        <div>
          <label className="mobile-label">Nga</label>
          <MobileDateInput value={from} onChange={setFrom} aria-label="Nga" placeholder="Nga" />
        </div>
        <div>
          <label className="mobile-label">Deri</label>
          <MobileDateInput value={to} onChange={setTo} aria-label="Deri" placeholder="Deri" />
        </div>
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
      ) : loading ? (
        <div className="dynamic-mobile-summary-list">
          <SkeletonRow count={Math.min(summaryLocations.length, 6)} />
        </div>
      ) : (
        <div
          className={`dynamic-mobile-summary-list${scrollableList ? ' dynamic-mobile-summary-list--scrollable' : ''}`}
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
