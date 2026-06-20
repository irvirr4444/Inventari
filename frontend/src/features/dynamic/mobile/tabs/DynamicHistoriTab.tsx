import * as React from 'react'
import type { ActionBatch } from '../../../../lib/api'
import { DaljeIcon, HyrjeIcon, LlojiTransferIcon } from '../../../../components/icons'
import {
  applyHistoryClientFilters,
  EMPTY_CLIENT_FILTERS,
  hasActiveClientFilters,
  type HistoryClientFilters,
} from '../../../../lib/historyClientFilters'
import { useHistoryBatches } from '../../../../hooks/useHistoryBatches'
import { useDynamicProductsQuery } from '../../../../hooks/useDynamicProductsQuery'
import { useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import {
  fmtEuro,
  formatDisplayDate,
  productCountLabel,
} from '../../../../lib/format'
import { formatActionDateTime } from '../../../../lib/actionMeta'
import { BottomSheet } from '../../../../mobile/components/BottomSheet'
import { SheetActionFooter } from '../../../../mobile/components/SheetActions'
import { FilterChips } from '../../../../mobile/components/FilterChips'
import { HistoriAdvancedFiltersPanel } from '../../../../mobile/components/HistoriAdvancedFiltersPanel'
import { MobileDateInput } from '../../../../mobile/components/MobileDateInput'
import { SkeletonRow } from '../../../../mobile/components/SkeletonRow'
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
    () => applyHistoryClientFilters(history.actions, appliedClientFilters),
    [history.actions, appliedClientFilters],
  )

  const hasAdvancedFilters = hasActiveClientFilters(appliedClientFilters)
  const locationFilterCount = appliedClientFilters.locationIds.length
  const locationLabel =
    locationFilterCount === 0
      ? 'Lokacioni'
      : locationFilterCount === 1
        ? activeLokacionet.find((l) => l.id === appliedClientFilters.locationIds[0])?.emri ??
          'Lokacioni'
        : `${locationFilterCount} lokacione`

  const openAdvancedFilters = React.useCallback(() => {
    setDraftClientFilters(appliedClientFilters)
    setAdvancedFiltersOpen((open) => !open)
  }, [appliedClientFilters])

  const applyAdvancedFilters = React.useCallback(() => {
    setAppliedClientFilters(draftClientFilters)
    setAdvancedFiltersOpen(false)
  }, [draftClientFilters])

  const clearAdvancedFilters = React.useCallback(() => {
    setDraftClientFilters(EMPTY_CLIENT_FILTERS)
    setAppliedClientFilters(EMPTY_CLIENT_FILTERS)
    setAdvancedFiltersOpen(false)
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

  const llojiLabel = history.filters.lloji ?? 'Lloji'

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
          <div className="mobile-tab-panel">
            <FilterChips
              chips={[
                { id: 'lloji', label: llojiLabel, active: !!history.filters.lloji },
                { id: 'lokacioni', label: locationLabel, active: locationFilterCount > 0 },
                {
                  id: 'advanced',
                  label: advancedFiltersOpen ? 'Filtrat e avancuara ▴' : 'Filtrat e avancuara ▾',
                  active: advancedFiltersOpen,
                  indicator: hasAdvancedFilters,
                },
                ...(history.filters.lloji ||
                history.filters.dateFrom ||
                history.filters.dateTo ||
                locationFilterCount > 0
                  ? [{ id: 'clear', label: 'Pastro', active: false }]
                  : []),
              ]}
              onSelect={(id) => {
                if (id === 'clear') {
                  history.updateFilters({
                    lloji: undefined,
                    dateFrom: undefined,
                    dateTo: undefined,
                  })
                  setAppliedClientFilters(EMPTY_CLIENT_FILTERS)
                  return
                }
                if (id === 'advanced') {
                  openAdvancedFilters()
                  return
                }
                if (id === 'lloji') setLlojiOpen(true)
                if (id === 'lokacioni') setLocationOpen(true)
              }}
            />

            <HistoriAdvancedFiltersPanel
              open={advancedFiltersOpen}
              draft={draftClientFilters}
              onDraftChange={(patch) => setDraftClientFilters((prev) => ({ ...prev, ...patch }))}
              onApply={applyAdvancedFilters}
              onClear={clearAdvancedFilters}
            />

            <div className="mobile-field-row">
              <div>
                <label className="mobile-label">Nga</label>
                <MobileDateInput
                  value={history.filters.dateFrom ?? ''}
                  onChange={(v) => history.updateFilters({ dateFrom: v || undefined })}
                  aria-label="Nga data"
                  placeholder="Nga"
                />
              </div>
              <div>
                <label className="mobile-label">Deri</label>
                <MobileDateInput
                  value={history.filters.dateTo ?? ''}
                  onChange={(v) => history.updateFilters({ dateTo: v || undefined })}
                  aria-label="Deri data"
                  placeholder="Deri"
                />
              </div>
            </div>

            {history.error ? <div className="mobile-inline-error">{history.error}</div> : null}

            {history.listQuery.isLoading ? (
              <SkeletonRow count={5} />
            ) : history.actions.length === 0 ? (
              <div className="mobile-empty">
                <div className="mobile-empty-title">Nuk ka veprime</div>
              </div>
            ) : filteredActions.length === 0 ? (
              <div className="mobile-empty">
                <div className="mobile-empty-title">Asnjë rezultat</div>
              </div>
            ) : (
              <div className="mobile-list-stack">
                {filteredActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="mobile-row-card"
                    style={{
                      width: '100%',
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
                      {productCountLabel(action.item_count)} · {fmtEuro(action.totali)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {history.total > 0 ? (
              <div className="mobile-pagination">
                <button
                  type="button"
                  className="mobile-pagination-btn"
                  disabled={history.page <= 1}
                  onClick={() => history.setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span className="mobile-card-meta">
                  {history.page} / {history.totalPages}
                </span>
                <button
                  type="button"
                  className="mobile-pagination-btn"
                  disabled={history.page >= history.totalPages}
                  onClick={() => history.setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>

          <BottomSheet open={llojiOpen} title="Lloji" onClose={() => setLlojiOpen(false)}>
            <div className="mobile-list-stack">
              {LLOJI_FILTER_OPTIONS.map(({ id, label, icon: Icon, tone }) => (
                <button
                  key={id}
                  type="button"
                  className={`mobile-tap-field${history.filters.lloji === id ? ' selected' : ''}`}
                  onClick={() => {
                    history.updateFilters({ lloji: history.filters.lloji === id ? undefined : id })
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
    </>
  )
}
