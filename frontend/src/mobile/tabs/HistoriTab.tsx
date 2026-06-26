import * as React from 'react'
import type { Country } from '../../lib/country'
import { COUNTRY_META } from '../../lib/country'
import type { ActionBatch } from '../../lib/api'
import { DaljeIcon, HyrjeIcon, LlojiTransferIcon } from '../../components/icons'
import { fmtEuro, formatDisplayDate, productCountLabel, countryLabel } from '../../lib/format'
import { formatActionDateTime } from '../../lib/actionMeta'
import {
  applyHistoryClientFilters,
  advancedHistoriFilterValueLabel,
  countAdvancedHistoriFilters,
  EMPTY_CLIENT_FILTERS,
  getHistoryFilterRangeIssues,
  notifyHistoryFilterRangeIssues,
  type HistoryClientFilters,
  type HistoryFilterRangeIssue,
} from '../../lib/historyClientFilters'
import { HISTORY_PAGE_SIZE, useHistoryBatches } from '../../hooks/useHistoryBatches'
import { useProductsQuery } from '../../hooks/useProductsQuery'
import { BottomSheet } from '../components/BottomSheet'
import { SheetActionFooter } from '../components/SheetActions'
import { FilterChips } from '../components/FilterChips'
import {
  ALL_FILTER_VALUE_LABEL,
  ALL_SHTETET_LABEL,
  ALL_VEPRIMET_LABEL,
} from '../constants/historiFilters'
import { HistoriAdvancedFiltersPanel } from '../components/HistoriAdvancedFiltersPanel'
import { HistoryExportActions } from '../../features/history/HistoryExportActions'
import { MobileHistoriActionCard } from '../components/MobileHistoriActionCard'
import { MobileHistoriListPending } from '../components/MobileHistoriListPending'
import { MobilePagination } from '../components/MobilePagination'
import type { MobileHeaderState } from '../types'
import { HistoriBatchDetail } from './HistoriBatchDetail'

const LLOJI_FILTER_OPTIONS = [
  { id: 'Hyrje' as const, label: 'Hyrje', icon: HyrjeIcon, tone: 'hyrje' },
  { id: 'Dalje' as const, label: 'Dalje', icon: DaljeIcon, tone: 'dalje' },
  { id: 'Transfer' as const, label: 'Transfer', icon: LlojiTransferIcon, tone: 'transfer' },
]

export function HistoriTab(props: {
  notify: (message: string, variant?: 'success' | 'default' | 'error') => void
  onHeaderChange: (header: MobileHeaderState) => void
}) {
  const productsQuery = useProductsQuery()
  const history = useHistoryBatches({ onNotify: props.notify })
  const [screen, setScreen] = React.useState<{ mode: 'list' | 'detail'; batchId?: string }>({
    mode: 'list',
  })
  const [deleteTarget, setDeleteTarget] = React.useState<Pick<
    ActionBatch,
    'id' | 'lloji' | 'data'
  > | null>(null)
  const [llojiOpen, setLlojiOpen] = React.useState(false)
  const [shtetiOpen, setShtetiOpen] = React.useState(false)
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = React.useState(false)
  const [draftClientFilters, setDraftClientFilters] =
    React.useState<HistoryClientFilters>(EMPTY_CLIENT_FILTERS)
  const [appliedClientFilters, setAppliedClientFilters] =
    React.useState<HistoryClientFilters>(EMPTY_CLIENT_FILTERS)
  const [draftDateFrom, setDraftDateFrom] = React.useState('')
  const [draftDateTo, setDraftDateTo] = React.useState('')
  const [draftShenim, setDraftShenim] = React.useState('')
  const [rangeIssues, setRangeIssues] = React.useState<HistoryFilterRangeIssue[]>([])

  const products = productsQuery.data ?? []

  const filteredActions = React.useMemo(
    () => applyHistoryClientFilters(history.actions, appliedClientFilters),
    [history.actions, appliedClientFilters],
  )

  const advancedFilterCount = countAdvancedHistoriFilters(appliedClientFilters, history.filters)
  const hasAdvancedFilters = advancedFilterCount > 0

  const openAdvancedFilters = React.useCallback(() => {
    setDraftClientFilters(appliedClientFilters)
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
      const issues = getHistoryFilterRangeIssues(server, next)
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
    [draftClientFilters, draftDateFrom, draftDateTo, draftShenim, props],
  )

  const applyAdvancedFilters = React.useCallback(() => {
    const server = {
      dateFrom: draftDateFrom || undefined,
      dateTo: draftDateTo || undefined,
      shenim: draftShenim || undefined,
    }
    const issues = getHistoryFilterRangeIssues(server, draftClientFilters)
    if (issues.length > 0) {
      setRangeIssues(issues)
      notifyHistoryFilterRangeIssues(issues, props.notify)
      return
    }
    setRangeIssues([])
    history.updateFilters(server)
    setAppliedClientFilters(draftClientFilters)
    setAdvancedFiltersOpen(false)
  }, [draftClientFilters, draftDateFrom, draftDateTo, draftShenim, history, props])

  const clearAdvancedFilters = React.useCallback(() => {
    setDraftClientFilters(EMPTY_CLIENT_FILTERS)
    setAppliedClientFilters(EMPTY_CLIENT_FILTERS)
    setDraftDateFrom('')
    setDraftDateTo('')
    setDraftShenim('')
    setRangeIssues([])
    history.updateFilters({ shenim: undefined, dateFrom: undefined, dateTo: undefined })
    setAdvancedFiltersOpen(false)
  }, [history])

  const goToList = React.useCallback(() => setScreen({ mode: 'list' }), [])
  const { onHeaderChange } = props

  React.useEffect(() => {
    if (screen.mode === 'list') {
      onHeaderChange({ kind: 'tab' })
    }
    return () => onHeaderChange({ kind: 'tab' })
  }, [screen.mode, onHeaderChange])

  const veprimValue = history.filters.lloji ?? ALL_FILTER_VALUE_LABEL
  const shtetiValue = history.filters.shteti
    ? countryLabel(history.filters.shteti)
    : ALL_FILTER_VALUE_LABEL
  const advancedValue = advancedHistoriFilterValueLabel(advancedFilterCount)
  const { isInitialLoad, isRefreshing } = history.listRefresh

  return (
    <>
      {screen.mode === 'detail' && screen.batchId ? (
        <HistoriBatchDetail
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
                  id: 'shteti',
                  label: 'Shteti',
                  value: shtetiValue,
                  active: !!history.filters.shteti,
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
                if (id === 'shteti') setShtetiOpen(true)
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
                          variant="legacy"
                          dateTime={formatActionDateTime(action.data, action.ora)}
                          summary={
                            <>
                              {productCountLabel(action.item_count)} · {fmtEuro(action.totali)}
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

          <BottomSheet open={shtetiOpen} title="Shteti" onClose={() => setShtetiOpen(false)}>
            <div className="mobile-list-stack">
              <button
                type="button"
                className={`mobile-tap-field${!history.filters.shteti ? ' selected' : ''}`}
                onClick={() => {
                  history.updateFilters({ shteti: undefined })
                  setShtetiOpen(false)
                }}
              >
                {ALL_SHTETET_LABEL}
              </button>
              {(['XK', 'AL'] as Country[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`mobile-tap-field${history.filters.shteti === c ? ' selected' : ''}`}
                  onClick={() => {
                    history.updateFilters({ shteti: c })
                    setShtetiOpen(false)
                  }}
                >
                  <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <img className="flagIcon" src={COUNTRY_META[c].flagSrc} alt="" width={20} height={14} />
                    {countryLabel(c)}
                  </span>
                </button>
              ))}
            </div>
          </BottomSheet>
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
        dateFrom={draftDateFrom}
        dateTo={draftDateTo}
        shenim={draftShenim}
        rangeIssues={rangeIssues}
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
