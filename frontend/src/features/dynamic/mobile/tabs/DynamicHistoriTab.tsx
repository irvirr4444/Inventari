import * as React from 'react'
import type { ActionBatch } from '../../../../lib/api'
import { DaljeIcon, HyrjeIcon, LlojiTransferIcon } from '../../../../components/icons'
import {
  applyHistoryClientFilters,
  advancedHistoriFilterValueLabel,
  countAdvancedHistoriFilters,
  EMPTY_CLIENT_FILTERS,
  type HistoryClientFilters,
} from '../../../../lib/historyClientFilters'
import { HISTORY_PAGE_SIZE, useHistoryBatches } from '../../../../hooks/useHistoryBatches'
import { useDynamicProductsQuery } from '../../../../hooks/useDynamicProductsQuery'
import { useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { useTenantConfig } from '../../../../hooks/useTenantConfig'
import {
  fmtEuro,
  formatDisplayDate,
  productCountLabel,
} from '../../../../lib/format'
import { formatActionDateTime } from '../../../../lib/actionMeta'
import { BottomSheet } from '../../../../mobile/components/BottomSheet'
import { SheetActionFooter } from '../../../../mobile/components/SheetActions'
import { FilterChips } from '../../../../mobile/components/FilterChips'
import {
  ALL_FILTER_VALUE_LABEL,
  ALL_VEPRIMET_LABEL,
} from '../../../../mobile/constants/historiFilters'
import { HistoriAdvancedFiltersPanel } from '../../../../mobile/components/HistoriAdvancedFiltersPanel'
import { MobileHistoriListPending } from '../../../../mobile/components/MobileHistoriListPending'
import { MobilePagination } from '../../../../mobile/components/MobilePagination'
import type { MobileHeaderState } from '../../../../mobile/types'
import { DynamicLocationMultiPickerSheet } from '../components/DynamicLocationMultiPickerSheet'
import { DynamicHistoriBatchDetail } from './DynamicHistoriBatchDetail'

function MobileLlojiBadge(props: { lloji: ActionBatch['lloji'] }) {
  const cls =
    props.lloji === 'Hyrje'
      ? 'mobile-badge-hyrje'
      : props.lloji === 'Dalje'
        ? 'mobile-badge-dalje'
        : 'mobile-badge-transfer'
  return <span className={`mobile-badge ${cls}`}>{props.lloji}</span>
}

const LLOJI_FILTER_OPTIONS = [
  { id: 'Hyrje' as const, label: 'Hyrje', icon: HyrjeIcon, tone: 'hyrje' },
  { id: 'Dalje' as const, label: 'Dalje', icon: DaljeIcon, tone: 'dalje' },
  { id: 'Transfer' as const, label: 'Transfer', icon: LlojiTransferIcon, tone: 'transfer' },
]

export function DynamicHistoriTab(props: {
  notify: (message: string, variant?: 'success' | 'default' | 'error') => void
  onHeaderChange: (header: MobileHeaderState) => void
}) {
  const productsQuery = useDynamicProductsQuery()
  const { trackPrice } = useTenantConfig()
  const history = useHistoryBatches({ onNotify: props.notify })
  const { activeLokacionet } = useLokacioni()
  const [screen, setScreen] = React.useState<{ mode: 'list' | 'detail'; batchId?: string }>({
    mode: 'list',
  })
  const [deleteTarget, setDeleteTarget] = React.useState<Pick<
    ActionBatch,
    'id' | 'lloji' | 'data'
  > | null>(null)
  const [llojiOpen, setLlojiOpen] = React.useState(false)
  const [locationOpen, setLocationOpen] = React.useState(false)
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = React.useState(false)
  const [draftClientFilters, setDraftClientFilters] =
    React.useState<HistoryClientFilters>(EMPTY_CLIENT_FILTERS)
  const [appliedClientFilters, setAppliedClientFilters] =
    React.useState<HistoryClientFilters>(EMPTY_CLIENT_FILTERS)

  const products = productsQuery.data ?? []

  const filteredActions = React.useMemo(
    () => applyHistoryClientFilters(history.actions, appliedClientFilters, { trackPrice }),
    [history.actions, appliedClientFilters, trackPrice],
  )

  const advancedFilterCount = countAdvancedHistoriFilters(
    appliedClientFilters,
    history.filters,
    { trackPrice },
  )
  const hasAdvancedFilters = advancedFilterCount > 0
  const locationFilterCount = appliedClientFilters.locationIds.length
  const locationValue =
    locationFilterCount === 0
      ? ALL_FILTER_VALUE_LABEL
      : locationFilterCount === 1
        ? activeLokacionet.find((l) => l.id === appliedClientFilters.locationIds[0])?.emri ??
          ALL_FILTER_VALUE_LABEL
        : `${locationFilterCount} lokacione`
  const veprimValue = history.filters.lloji ?? ALL_FILTER_VALUE_LABEL
  const advancedValue = advancedHistoriFilterValueLabel(advancedFilterCount)
  const { isInitialLoad, isRefreshing } = history.listRefresh

  const openAdvancedFilters = React.useCallback(() => {
    setDraftClientFilters(appliedClientFilters)
    setAdvancedFiltersOpen(true)
  }, [appliedClientFilters])

  const closeAdvancedFilters = React.useCallback(() => {
    setAdvancedFiltersOpen(false)
  }, [])

  const applyAdvancedFilters = React.useCallback(() => {
    setAppliedClientFilters(draftClientFilters)
    setAdvancedFiltersOpen(false)
  }, [draftClientFilters])

  const clearAdvancedFilters = React.useCallback(() => {
    setDraftClientFilters(EMPTY_CLIENT_FILTERS)
    setAppliedClientFilters(EMPTY_CLIENT_FILTERS)
    history.updateFilters({ shenim: undefined, dateFrom: undefined, dateTo: undefined })
    setAdvancedFiltersOpen(false)
  }, [history])

  const clearLocationFilter = React.useCallback(() => {
    setAppliedClientFilters((prev) => ({ ...prev, locationIds: [] }))
  }, [])

  const toggleLocationFilter = (id: string) => {
    setAppliedClientFilters((prev) => {
      const next = prev.locationIds.includes(id)
        ? prev.locationIds.filter((x) => x !== id)
        : [...prev.locationIds, id]
      return { ...prev, locationIds: next }
    })
  }

  const goToList = React.useCallback(() => setScreen({ mode: 'list' }), [])
  const { onHeaderChange } = props

  React.useEffect(() => {
    if (screen.mode === 'list') {
      onHeaderChange({ kind: 'tab' })
    }
    return () => onHeaderChange({ kind: 'tab' })
  }, [screen.mode, onHeaderChange])

  const formatLocationRoute = (action: ActionBatch) => {
    if (action.lloji === 'Transfer' && action.destination_lokacioni_emri) {
      return `${action.flag_emoji ?? '📍'} ${action.lokacioni_emri ?? '—'} → ${action.destination_flag_emoji ?? '📍'} ${action.destination_lokacioni_emri}`
    }
    return `${action.flag_emoji ?? '📍'} ${action.lokacioni_emri ?? '—'}`
  }

  return (
    <>
      {screen.mode === 'detail' && screen.batchId ? (
        <DynamicHistoriBatchDetail
          batchId={screen.batchId}
          products={products}
          onNotify={props.notify}
          onDeleteRequest={(batch) => setDeleteTarget(batch)}
          onHeaderChange={props.onHeaderChange}
          onBackToList={goToList}
          onBatchIdChange={(batchId) => setScreen({ mode: 'detail', batchId })}
        />
      ) : (
        <>
          <div className="mobile-tab-panel mobile-tab-panel--histori-list">
            <FilterChips
              chips={[
                {
                  id: 'lloji',
                  label: 'Veprime',
                  value: veprimValue,
                  active: !!history.filters.lloji,
                },
                {
                  id: 'lokacioni',
                  label: 'Lokacione',
                  value: locationValue,
                  active: locationFilterCount > 0,
                },
                {
                  id: 'advanced',
                  label: 'Filtra',
                  value: advancedValue,
                  active: advancedFiltersOpen,
                  indicator: hasAdvancedFilters,
                },
              ]}
              onSelect={(id) => {
                if (id === 'advanced') {
                  openAdvancedFilters()
                  return
                }
                if (id === 'lloji') setLlojiOpen(true)
                if (id === 'lokacioni') setLocationOpen(true)
              }}
            />

            {history.error ? <div className="mobile-inline-error">{history.error}</div> : null}

            <div
              className={`mobile-histori-list-wrap${isRefreshing ? ' is-refreshing' : ''}`}
              aria-busy={isInitialLoad || isRefreshing}
            >
              {isInitialLoad ? (
                <MobileHistoriListPending variant="initial" />
              ) : history.actions.length === 0 ? (
                <div className="mobile-empty">
                  <div className="mobile-empty-title">Nuk ka veprime</div>
                </div>
              ) : filteredActions.length === 0 ? (
                <div className="mobile-empty">
                  <div className="mobile-empty-title">Asnjë rezultat</div>
                </div>
              ) : (
                <>
                  {isRefreshing ? <MobileHistoriListPending variant="overlay" /> : null}
                  <div
                    key={history.page}
                    className={`mobile-histori-list${isRefreshing ? '' : ' mobile-histori-list--settle'}`}
                  >
                  {Array.from({ length: HISTORY_PAGE_SIZE }, (_, i) => {
                    const action = filteredActions[i]
                    if (!action) {
                      return (
                        <div
                          key={`pad-${i}`}
                          className="mobile-histori-list-slot mobile-histori-list-slot--empty"
                          aria-hidden
                        />
                      )
                    }
                    return (
                      <div key={action.id} className="mobile-histori-list-slot">
                        <button
                          type="button"
                          className="mobile-row-card mobile-histori-row-card"
                          style={{
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            cursor: 'pointer',
                          }}
                          onClick={() => setScreen({ mode: 'detail', batchId: action.id })}
                        >
                          <div className="row" style={{ gap: 8, alignItems: 'center', width: '100%' }}>
                            <MobileLlojiBadge lloji={action.lloji} />
                            <span className="mobile-card-meta">
                              {formatActionDateTime(action.data, action.ora)}
                            </span>
                          </div>
                          {action.pershkrimi?.trim() ? (
                            <div
                              className="mobile-card-meta mobile-card-meta-secondary mobile-meta-truncate"
                              title={action.pershkrimi.trim()}
                            >
                              {action.pershkrimi.trim()}
                            </div>
                          ) : null}
                          <div
                            className="mobile-card-meta row"
                            style={{ gap: 6, marginTop: 6, alignItems: 'center' }}
                          >
                            {formatLocationRoute(action)}
                          </div>
                          <div className="mobile-card-meta" style={{ marginTop: 6 }}>
                            {productCountLabel(action.item_count)}
                            {trackPrice ? <> · {fmtEuro(action.totali)}</> : null}
                          </div>
                        </button>
                      </div>
                    )
                  })}
                  </div>
                </>
              )}
            </div>

            {history.total > 0 ? (
              <MobilePagination
                page={history.page}
                totalPages={history.totalPages}
                total={history.total}
                pageSize={HISTORY_PAGE_SIZE}
                onPageChange={(nextPage) => history.setPage(nextPage)}
              />
            ) : null}
          </div>

          <BottomSheet open={llojiOpen} title="Veprimi" onClose={() => setLlojiOpen(false)}>
            <div className="mobile-list-stack">
              <button
                type="button"
                className={`mobile-tap-field${!history.filters.lloji ? ' selected' : ''}`}
                onClick={() => {
                  history.updateFilters({ lloji: undefined })
                  setLlojiOpen(false)
                }}
              >
                {ALL_VEPRIMET_LABEL}
              </button>
              {LLOJI_FILTER_OPTIONS.map(({ id, label, icon: Icon, tone }) => (
                <button
                  key={id}
                  type="button"
                  className={`mobile-tap-field${history.filters.lloji === id ? ' selected' : ''}`}
                  onClick={() => {
                    history.updateFilters({ lloji: id })
                    setLlojiOpen(false)
                  }}
                >
                  <span className="row" style={{ gap: 12, alignItems: 'center' }}>
                    <span className={`mobile-lloji-icon mobile-lloji-icon-${tone}`}>
                      <Icon />
                    </span>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </BottomSheet>

          <DynamicLocationMultiPickerSheet
            open={locationOpen}
            title="Lokacioni"
            selectedIds={appliedClientFilters.locationIds}
            onToggle={toggleLocationFilter}
            onClearAll={clearLocationFilter}
            allowAdd
            onNotify={props.notify}
            onClose={() => setLocationOpen(false)}
          />
        </>
      )}

      <BottomSheet
        open={!!deleteTarget}
        title="Fshij veprimin?"
        onClose={() => setDeleteTarget(null)}
        footer={
          <SheetActionFooter
            onCancel={() => setDeleteTarget(null)}
            confirmLabel={history.deleteMut.isPending ? 'Duke fshire…' : 'Fshij'}
            confirmLoading={history.deleteMut.isPending}
            confirmVariant="danger"
            confirmIcon="delete"
            onConfirm={() => {
              if (!deleteTarget) return
              history.deleteMut.mutate(deleteTarget.id, {
                onSuccess: () => {
                  setDeleteTarget(null)
                  setScreen({ mode: 'list' })
                },
              })
            }}
          />
        }
      >
        {deleteTarget ? (
          <p className="mobile-card-meta">
            Veprimi {deleteTarget.lloji} me date {formatDisplayDate(deleteTarget.data)} do te fshihet.
          </p>
        ) : null}
      </BottomSheet>

      <HistoriAdvancedFiltersPanel
        open={advancedFiltersOpen}
        onClose={closeAdvancedFilters}
        draft={draftClientFilters}
        dateFrom={history.filters.dateFrom ?? ''}
        dateTo={history.filters.dateTo ?? ''}
        shenim={history.filters.shenim ?? ''}
        showTotali={trackPrice}
        onDraftChange={(patch) => setDraftClientFilters((prev) => ({ ...prev, ...patch }))}
        onDateFromChange={(v) => history.updateFilters({ dateFrom: v || undefined })}
        onDateToChange={(v) => history.updateFilters({ dateTo: v || undefined })}
        onShenimChange={(v) => history.updateFilters({ shenim: v || undefined })}
        onApply={applyAdvancedFilters}
        onClear={clearAdvancedFilters}
      />
    </>
  )
}
