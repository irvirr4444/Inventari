import * as React from 'react'
import type { GroupedSummaryResult, SummaryGroupBy } from '@inventari/shared'
import { useSummaryDateRange } from '../../../../hooks/useSummaryQuery'
import { useTenantConfig } from '../../../../hooks/useTenantConfig'
import { exportUrl } from '../../../../lib/api'
import { fmt, fmtInt } from '../../../../lib/format'
import { queryRefreshState } from '../../../../lib/queryRefreshState'
import { useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { MobileDateRangeInput } from '../../../../mobile/components/MobileDateRangeInput'
import { MobileSummaryListPending } from '../../../../mobile/components/MobileSummaryListPending'
import { SummaryGroupByControl } from '../../../summary/SummaryGroupByControl'

function GroupSummaryCard(props: {
  emoji?: string
  name: string
  inQty: number
  inValue: number
  outQty: number
  outValue: number
  trackPrice: boolean
}) {
  return (
    <article className="dynamic-mobile-summary-card">
      <header className="dynamic-mobile-summary-card-head">
        {props.emoji ? (
          <span className="dynamic-mobile-summary-card-emoji" aria-hidden="true">
            {props.emoji}
          </span>
        ) : null}
        <span className="dynamic-mobile-summary-card-name">{props.name}</span>
      </header>
      <div className="dynamic-mobile-summary-card-grid">
        <div className="dynamic-mobile-summary-stat dynamic-mobile-summary-stat--in">
          <span className="dynamic-mobile-summary-stat-label">Hyrje</span>
          <span className="dynamic-mobile-summary-stat-qty mobile-num">
            {fmtInt(props.inQty)}
          </span>
          {props.trackPrice ? (
            <span className="dynamic-mobile-summary-stat-value mobile-num">
              {fmt(props.inValue)} €
            </span>
          ) : null}
        </div>
        <div className="dynamic-mobile-summary-stat dynamic-mobile-summary-stat--out">
          <span className="dynamic-mobile-summary-stat-label">Dalje</span>
          <span className="dynamic-mobile-summary-stat-qty mobile-num">
            {fmtInt(props.outQty)}
          </span>
          {props.trackPrice ? (
            <span className="dynamic-mobile-summary-stat-value mobile-num">
              {fmt(props.outValue)} €
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function DynamicPërmbledhjeTab() {
  const { trackPrice } = useTenantConfig()
  const [groupBy, setGroupBy] = React.useState<SummaryGroupBy>('location')
  const { from, setFrom, to, setTo, query } = useSummaryDateRange(groupBy)
  const { activeLokacionet } = useLokacioni()
  const summaryLocations = activeLokacionet
    .filter((l) => l.show_in_summary)
    .sort((a, b) => a.rradhitja - b.rradhitja)
  const locationById = new Map(summaryLocations.map((loc) => [loc.id, loc]))

  const { isInitialLoad, isRefreshing } = queryRefreshState(query)
  const summaryData = query.data as GroupedSummaryResult | undefined
  const rows = summaryData?.rows ?? []
  const scrollableList = rows.length > 6

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

      <SummaryGroupByControl
        value={groupBy}
        onChange={setGroupBy}
        className="summary-group-by--mobile"
      />

      {query.error ? (
        <div className="mobile-inline-error">
          {query.error instanceof Error ? query.error.message : 'Nuk u lexua permbledhja.'}
        </div>
      ) : null}

      {groupBy === 'location' && summaryLocations.length === 0 ? (
        <div className="mobile-empty">
          <div className="mobile-empty-title">Nuk ka vendndodhje te shfaqura ne permbledhje.</div>
        </div>
      ) : isInitialLoad ? (
        <MobileSummaryListPending count={Math.min(Math.max(rows.length, summaryLocations.length), 6)} />
      ) : rows.length === 0 ? (
        <div className="mobile-empty">
          <div className="mobile-empty-title">Nuk ka te dhena per kete periudhe.</div>
        </div>
      ) : (
        <div
          className={`dynamic-mobile-summary-list mobile-panel-enter${scrollableList ? ' dynamic-mobile-summary-list--scrollable' : ''}${isRefreshing ? ' is-refreshing' : ''}`}
        >
          {rows.map((row) => {
            const loc = groupBy === 'location' ? locationById.get(row.id) : undefined
            return (
              <GroupSummaryCard
                key={row.id}
                emoji={loc?.flag_emoji ?? (groupBy === 'location' ? '📍' : undefined)}
                name={row.label}
                inQty={row.in_qty}
                inValue={row.in_value}
                outQty={row.out_qty}
                outValue={row.out_value}
                trackPrice={trackPrice}
              />
            )
          })}
        </div>
      )}

      <a
        className="mobile-btn-outline dynamic-permbledhje-export"
        href={exportUrl('xlsx', { from, to, groupBy })}
      >
        Shkarko Excel
      </a>
    </div>
  )
}
