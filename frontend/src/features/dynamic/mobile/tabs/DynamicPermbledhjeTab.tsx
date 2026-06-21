import type { CountrySummary as CountrySummaryData } from '@inventari/shared'
import { useSummaryDateRange } from '../../../../hooks/useSummaryQuery'
import { useTenantConfig } from '../../../../hooks/useTenantConfig'
import { exportUrl } from '../../../../lib/api'
import { fmt, fmtInt } from '../../../../lib/format'
import { useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { MobileDateInput } from '../../../../mobile/components/MobileDateInput'
import { SkeletonRow } from '../../../../mobile/components/SkeletonRow'

function LocationSummarySection(props: {
  emoji: string
  name: string
  loading: boolean
  summary: CountrySummaryData
  trackPrice: boolean
}) {
  if (props.loading) return <SkeletonRow count={2} />

  return (
    <section className="mobile-summary-section">
      <div
        className="mobile-card-label row"
        style={{ gap: 8, alignItems: 'center', marginBottom: 12 }}
      >
        <span>{props.emoji}</span>
        {props.name}
      </div>
      <div className="mobile-summary-row">
        <span>Hyrje (sasi)</span>
        <span className="mobile-num">{fmtInt(props.summary.in_qty)}</span>
      </div>
      {props.trackPrice ? (
        <div className="mobile-summary-row">
          <span>Hyrje (vlerë)</span>
          <span className="mobile-num">{fmt(props.summary.in_value)} €</span>
        </div>
      ) : null}
      <div className="mobile-summary-row">
        <span>Dalje (sasi)</span>
        <span className="mobile-num">{fmtInt(props.summary.out_qty)}</span>
      </div>
      {props.trackPrice ? (
        <div className="mobile-summary-row">
          <span>Dalje (vlerë)</span>
          <span className="mobile-num">{fmt(props.summary.out_value)} €</span>
        </div>
      ) : null}
    </section>
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
  const useCompactList = summaryLocations.length > 3

  return (
    <div className="mobile-tab-panel">
      <div className="mobile-field-row">
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
        <SkeletonRow count={Math.min(summaryLocations.length, 4)} />
      ) : useCompactList ? (
        <div className="dynamic-mobile-summary-compact">
          {summaryLocations.map((loc) => {
            const s = summaryData[loc.id] ?? emptySummary
            return (
              <div key={loc.id} className="dynamic-mobile-summary-compact-row">
                <div className="mobile-card-label">
                  {loc.flag_emoji ?? '📍'} {loc.emri}
                </div>
                <div className="mobile-summary-row">
                  <span>Hyrje (sasi)</span>
                  <span className="mobile-num">{fmtInt(s.in_qty)}</span>
                </div>
                {trackPrice ? (
                  <div className="mobile-summary-row">
                    <span>Hyrje (vlerë)</span>
                    <span className="mobile-num">{fmt(s.in_value)} €</span>
                  </div>
                ) : null}
                <div className="mobile-summary-row">
                  <span>Dalje (sasi)</span>
                  <span className="mobile-num">{fmtInt(s.out_qty)}</span>
                </div>
                {trackPrice ? (
                  <div className="mobile-summary-row">
                    <span>Dalje (vlerë)</span>
                    <span className="mobile-num">{fmt(s.out_value)} €</span>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        summaryLocations.map((loc) => (
          <LocationSummarySection
            key={loc.id}
            emoji={loc.flag_emoji ?? '📍'}
            name={loc.emri}
            loading={false}
            summary={summaryData[loc.id] ?? emptySummary}
            trackPrice={trackPrice}
          />
        ))
      )}

      <a
        className="mobile-btn-outline"
        href={exportUrl('xlsx', { from, to })}
        style={{
          textAlign: 'center',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Shkarko Excel
      </a>
    </div>
  )
}
