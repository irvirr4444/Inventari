import * as React from 'react'
import type { ActionBatch } from '../../../../lib/api'
import { DaljeIcon, HyrjeIcon, LlojiTransferIcon } from '../../../../components/icons'
import { MobileHistoriActionCard } from '../../../../mobile/components/MobileHistoriActionCard'
import {
  applyHistoryClientFilters,
  advancedHistoriFilterValueLabel,
  countAdvancedHistoriFilters,
  EMPTY_CLIENT_FILTERS,
  getHistoryFilterRangeIssues,
  notifyHistoryFilterRangeIssues,
  type HistoryClientFilters,
  type HistoryFilterRangeIssue,
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
import { ALL_VEPRIMET_LABEL } from '../../../../mobile/constants/historiFilters'
import { HistoriAdvancedFiltersPanel } from '../../../../mobile/components/HistoriAdvancedFiltersPanel'
import { HistoryExportActions } from '../../../history/HistoryExportActions'
import { MobileHistoriListPending } from '../../../../mobile/components/MobileHistoriListPending'
import { MobilePagination } from '../../../../mobile/components/MobilePagination'
import type { MobileHeaderState } from '../../../../mobile/types'
import { DynamicLocationMultiPickerSheet } from '../components/DynamicLocationMultiPickerSheet'
import { DynamicHistoriBatchDetail } from './DynamicHistoriBatchDetail'
import {
  resolveHistoriLocationFilterLabel,
  resolveHistoriLlojiFilterLabel,
  toggleHistoriLloji,
  normalizeHistoriLlojet,
  type HistoriLloji,
} from '../../../../lib/historiFilterSelection'

const LLOJI_FILTER_OPTIONS = [
  { id: 'Hyrje' as const, label: 'Hyrje', icon: HyrjeIcon, tone: 'hyrje' },
  { id: 'Dalje' as const, label: 'Dalje', icon: DaljeIcon, tone: 'dalje' },
  { id: 'Transfer' as const, label: 'Transfer', icon: LlojiTransferIcon, tone: 'transfer' },
]

export function DynamicHistoriTab(props: {
  notify: (message: string, variant?: 'success' | 'default' | 'error') => void
  isActive: boolean
  onHeaderChange: (header: MobileHeaderState) => void
  onNavigateToHistori?: () => void
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
  const [draftDateFrom, setDraftDateFrom] = React.useState('')
  const [draftDateTo, setDraftDateTo] = React.useState('')
  const [draftShenim, setDraftShenim] = React.useState('')
  const [draftLlojet, setDraftLlojet] = React.useState<HistoriLloji[]>([])
  const [rangeIssues, setRangeIssues] = React.useState<HistoryFilterRangeIssue[]>([])

  const effectiveLlojet = React.useMemo((): HistoriLloji[] => {
    if (appliedClientFilters.llojet.length > 0) return appliedClientFilters.llojet
    if (history.filters.lloji) return [history.filters.lloji]
    return []
  }, [appliedClientFilters.llojet, history.filters.lloji])

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
  const locationValue = resolveHistoriLocationFilterLabel(
    appliedClientFilters.locationIds,
    activeLokacionet,
  )
  const veprimValue = resolveHistoriLlojiFilterLabel(effectiveLlojet)
  const llojiFilterActive =
    effectiveLlojet.length > 0 && effectiveLlojet.length < LLOJI_FILTER_OPTIONS.length
  const locationFilterActive =
    appliedClientFilters.locationIds.length > 0 &&
    appliedClientFilters.locationIds.length < activeLokacionet.length
  const advancedValue = advancedHistoriFilterValueLabel(advancedFilterCount)
  const { isInitialLoad, isRefreshing } = history.listRefresh

  const openAdvancedFilters = React.useCallback(() => {
    setDraftClientFilters({
      ...appliedClientFilters,
      locationIds: [],
      llojet: [],
    })
    setDraftDateFrom(history.filters.dateFrom ?? '')
    setDraftDateTo(history.filters.dateTo ?? '')
    setDraftShenim(history.filters.shenim ?? '')
    setRangeIssues([])
    setAdvancedFiltersOpen(true)
  }, [appliedClientFilters, history.filters.dateFrom, history.filters.dateTo, history.filters.shenim])

  const closeAdvancedFilters = React.useCallback(() => {
    setAdvancedFiltersOpen(false)
  }, [])

  const tryDraftOraChange = React.useCallback(
    (patch: Partial<Pick<HistoryClientFilters, 'oraFrom' | 'oraDeri'>>): boolean => {
      const next = { ...draftClientFilters, ...patch }
      const server = {
        dateFrom: draftDateFrom || undefined,
        dateTo: draftDateTo || undefined,
        shenim: draftShenim || undefined,
      }
      const issues = getHistoryFilterRangeIssues(server, next, { trackPrice })
      const oraIssues = issues.filter((issue) => issue.field === 'ora')
      if (oraIssues.length > 0) {
        setRangeIssues(issues)
        notifyHistoryFilterRangeIssues(oraIssues, props.notify)
        return false
      }
      setRangeIssues((prev) => prev.filter((issue) => issue.field !== 'ora'))
      setDraftClientFilters(next)
      return true
    },
    [draftClientFilters, draftDateFrom, draftDateTo, draftShenim, props, trackPrice],
  )

  const applyAdvancedFilters = React.useCallback(() => {
    const server = {
      dateFrom: draftDateFrom || undefined,
      dateTo: draftDateTo || undefined,
      shenim: draftShenim || undefined,
    }
    const issues = getHistoryFilterRangeIssues(server, draftClientFilters, { trackPrice })
    if (issues.length > 0) {
      setRangeIssues(issues)
      notifyHistoryFilterRangeIssues(issues, props.notify)
      return
    }
    setRangeIssues([])
    history.updateFilters(server)
    setAppliedClientFilters({
      ...draftClientFilters,
      locationIds: appliedClientFilters.locationIds,
      llojet: appliedClientFilters.llojet,
    })
    setAdvancedFiltersOpen(false)
  }, [draftClientFilters, draftDateFrom, draftDateTo, draftShenim, history, props, trackPrice])

  const clearAdvancedFilters = React.useCallback(() => {
    const preserved = {
      locationIds: appliedClientFilters.locationIds,
      llojet: appliedClientFilters.llojet,
    }
    setDraftClientFilters({ ...EMPTY_CLIENT_FILTERS, ...preserved })
    setAppliedClientFilters({ ...EMPTY_CLIENT_FILTERS, ...preserved })
    setDraftDateFrom('')
    setDraftDateTo('')
    setDraftShenim('')
    setRangeIssues([])
    history.updateFilters({ shenim: undefined, dateFrom: undefined, dateTo: undefined })
    setAdvancedFiltersOpen(false)
  }, [appliedClientFilters, history])

  const applyLocationFilter = React.useCallback((ids: string[]) => {
    setAppliedClientFilters((prev) => ({ ...prev, locationIds: ids }))
  }, [])

  const openLlojiSheet = React.useCallback(() => {
    setDraftLlojet(effectiveLlojet)
    setLlojiOpen(true)
  }, [effectiveLlojet])

  const applyLlojiFilter = React.useCallback(() => {
    const normalized = normalizeHistoriLlojet(draftLlojet)
    setAppliedClientFilters((prev) => ({ ...prev, llojet: normalized }))
    history.updateFilters({
      lloji: normalized.length === 1 ? normalized[0] : undefined,
    })
    setLlojiOpen(false)
  }, [draftLlojet, history])

  const openLocationSheet = React.useCallback(() => {
    setLocationOpen(true)
  }, [])

  const goToList = React.useCallback(() => setScreen({ mode: 'list' }), [])
  const handleSaveSuccess = React.useCallback(() => {
    props.onNavigateToHistori?.()
    goToList()
  }, [goToList, props.onNavigateToHistori])
  const { onHeaderChange } = props

  React.useEffect(() => {
    if (!props.isActive) return
    if (screen.mode === 'list') {
      onHeaderChange({ kind: 'tab' })
    }
    return () => onHeaderChange({ kind: 'tab' })
  }, [props.isActive, screen.mode, onHeaderChange])

  return (
    <>
      {screen.mode === 'detail' && screen.batchId ? (
        <DynamicHistoriBatchDetail
          batchId={screen.batchId}
          products={products}
          isActive={props.isActive}
          onNotify={props.notify}
          onDeleteRequest={(batch) => setDeleteTarget(batch)}
          onHeaderChange={props.onHeaderChange}
          onBackToList={goToList}
          onSaveSuccess={handleSaveSuccess}
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
                  active: llojiFilterActive,
                },
                {
                  id: 'lokacioni',
                  label: 'Lokacione',
                  value: locationValue,
                  active: locationFilterActive,
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
                if (id === 'lloji') openLlojiSheet()
                if (id === 'lokacioni') openLocationSheet()
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
                        <MobileHistoriActionCard
                          action={action}
                          variant="dynamic"
                          dateTime={formatActionDateTime(action.data, action.ora)}
                          summary={
                            <>
                              {productCountLabel(action.item_count)}
                              {trackPrice ? <> · {fmtEuro(action.totali)}</> : null}
                            </>
                          }
                          onClick={() => setScreen({ mode: 'detail', batchId: action.id })}
                        />
                      </div>
                    )
                  })}
                  </div>
                </>
              )}
            </div>

            <div
              className={`mobile-histori-footer${history.total > 0 ? '' : ' mobile-histori-footer--export-only'}`}
            >
              <HistoryExportActions
                variant="mobile-footer"
                serverFilters={history.filters}
                clientFilters={appliedClientFilters}
                trackPrice={trackPrice}
                onNotify={props.notify}
              />
              {history.total > 0 ? (
                <MobilePagination
                  compact
                  page={history.page}
                  totalPages={history.totalPages}
                  total={history.total}
                  pageSize={HISTORY_PAGE_SIZE}
                  onPageChange={(nextPage) => history.setPage(nextPage)}
                />
              ) : null}
            </div>
          </div>

          <BottomSheet
            open={llojiOpen}
            title="Veprimi"
            onClose={() => setLlojiOpen(false)}
            footer={
              <SheetActionFooter
                confirmLabel="Apliko"
                confirmIcon="check"
                onCancel={() => setLlojiOpen(false)}
                onConfirm={applyLlojiFilter}
              />
            }
          >
            <div className="mobile-list-stack">
              <button
                type="button"
                className={`mobile-tap-field${draftLlojet.length === 0 ? ' selected' : ''}`}
                onClick={() => setDraftLlojet([])}
              >
                {ALL_VEPRIMET_LABEL}
              </button>
              {LLOJI_FILTER_OPTIONS.map(({ id, label, icon: Icon, tone }) => {
                const checked = draftLlojet.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    className={`mobile-tap-field${checked ? ' selected' : ''}`}
                    onClick={() => setDraftLlojet((prev) => toggleHistoriLloji(prev, id))}
                  >
                    <span className="row" style={{ gap: 12, alignItems: 'center' }}>
                      <span className={`mobile-lloji-icon mobile-lloji-icon-${tone}`}>
                        <Icon />
                      </span>
                      {label}
                      {checked ? <span className="mobile-card-meta">✓</span> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </BottomSheet>

          <DynamicLocationMultiPickerSheet
            open={locationOpen}
            title="Lokacioni"
            selectedIds={appliedClientFilters.locationIds}
            onApply={applyLocationFilter}
            allowAdd
            onNotify={props.notify}
            onClose={() => setLocationOpen(false)}
          />
        </>
      )}

      <BottomSheet
        open={!!deleteTarget}
        title="Fshi veprimin?"
        onClose={() => setDeleteTarget(null)}
        footer={
          <SheetActionFooter
            onCancel={() => setDeleteTarget(null)}
            confirmLabel={history.deleteMut.isPending ? 'Duke fshire…' : 'Fshi'}
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
        dateFrom={draftDateFrom}
        dateTo={draftDateTo}
        shenim={draftShenim}
        rangeIssues={rangeIssues}
        showTotali={trackPrice}
        onDraftChange={(patch) => setDraftClientFilters((prev) => ({ ...prev, ...patch }))}
        onOraFromChange={(value) => tryDraftOraChange({ oraFrom: value })}
        onOraToChange={(value) => tryDraftOraChange({ oraDeri: value })}
        onDateRangeChange={(from, to) => {
          setDraftDateFrom(from)
          setDraftDateTo(to)
        }}
        onShenimChange={setDraftShenim}
        onApply={applyAdvancedFilters}
        onClear={clearAdvancedFilters}
      />
    </>
  )
}
