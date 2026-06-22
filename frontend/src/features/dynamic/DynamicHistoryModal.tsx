import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteActionBatch,
  getActionBatch,
  type ActionBatch,
  type DynamicProdukti,
} from '../../lib/api'
import { fmtEuro, formatDisplayDate } from '../../lib/format'
import {
  applyHistoryClientFilters,
  EMPTY_CLIENT_FILTERS,
  hasActiveClientFilters,
  hasActiveServerFilters,
  type HistoryClientFilters,
  type HistoryServerFilters,
} from '../../lib/historyClientFilters'
import { scheduleInvalidate, type InvalidateScope } from '../../lib/invalidateAppData'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useTenantConfig } from '../../hooks/useTenantConfig'
import { useLokacioni } from '../../lib/lokacioni/LokacioniProvider'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useFocusModalOnOpen } from '../../hooks/useFocusModalOnOpen'
import { useEscapeToClose } from '../../hooks/useEscapeToClose'
import { handleOverlayDismiss } from '../../lib/pointerDismissGuard'
import type { HistoryEditSaveResult } from '../history/historyEditSave'
import { ExpandedActionDetail } from '../history/ExpandedActionDetail'
import { EditIcon, DeleteIcon, LlojiBadge } from '../history/historyBadges'
import { HistoryBatchMetaDisplay } from '../history/HistoryBatchMetaDisplay'
import { HistorySkeletonTable, HISTORY_TABLE_COL_COUNT } from '../history/HistorySkeletonTable'
import {
  HISTORY_MODAL_PAGE_SIZE,
  HistoryTableEmptyBody,
  HistoryTablePadRows,
} from '../history/historyTableLayout'
import { HistoryModalTitleRow } from '../history/HistoryModalTitleRow'
import { DynamicActionEditModal } from './DynamicActionEditModal'
import { DynamicHistoryFilterBar } from './DynamicHistoryFilterBar'
import { DynamicLocationCell } from './DynamicLocationCell'
import {
  historyListRefreshState,
  useHistoryBatchListQuery,
} from '../../hooks/useHistoryBatchListQuery'

const PAGE_SIZE = HISTORY_MODAL_PAGE_SIZE

export function DynamicHistoryModal(props: {
  products: DynamicProdukti[]
  onClose: () => void
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
  variant?: 'modal' | 'embedded'
}) {
  const { products, onClose, onNotify, variant = 'modal' } = props
  const qc = useQueryClient()
  const { user } = useAuth()
  const { trackPrice } = useTenantConfig()
  const { activeLokacionet } = useLokacioni()
  const sortedLocations = [...activeLokacionet].sort((a, b) => a.rradhitja - b.rradhitja)

  const [filters, setFilters] = React.useState<HistoryServerFilters>({})
  const [clientFilters, setClientFilters] =
    React.useState<HistoryClientFilters>(EMPTY_CLIENT_FILTERS)
  const [page, setPage] = React.useState(1)
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => new Set())
  const [editActionId, setEditActionId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ActionBatch | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const updateFilters = (patch: Partial<HistoryServerFilters>) => {
    setFilters((prev) => {
      const next = { ...prev }
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '') {
          delete next[key as keyof HistoryServerFilters]
        } else {
          ;(next as Record<string, unknown>)[key] = value
        }
      }
      return next
    })
    setPage(1)
    setExpandedIds(new Set())
    setError(null)
  }

  const updateClientFilters = (patch: Partial<HistoryClientFilters>) => {
    setClientFilters((prev) => ({ ...prev, ...patch }))
    setExpandedIds(new Set())
  }

  const clearAllFilters = () => {
    setFilters({})
    setClientFilters(EMPTY_CLIENT_FILTERS)
    setPage(1)
    setExpandedIds(new Set())
    setError(null)
  }

  const toggleExpanded = (actionId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(actionId)) next.delete(actionId)
      else next.add(actionId)
      return next
    })
    setError(null)
  }

  const clearExpanded = () => setExpandedIds(new Set())

  const listQuery = useHistoryBatchListQuery(user?.id, filters, page, PAGE_SIZE)
  const { isInitialLoad, isRefreshing } = historyListRefreshState(listQuery)
  const isTableLoading = isInitialLoad || isRefreshing

  const prefetchDetail = React.useCallback(
    (actionId: string) => {
      void qc.prefetchQuery({
        queryKey: queryKeys.actionBatch(user?.id, actionId),
        queryFn: () => getActionBatch(actionId),
        staleTime: 30_000,
      })
    },
    [qc, user?.id],
  )

  const handleEditSaveComplete = React.useCallback(
    (actionId: string, result: HistoryEditSaveResult) => {
      const resolvedId = result.batch_id ?? actionId
      setEditActionId(null)
      setExpandedIds((prev) => {
        const next = new Set(prev)
        next.delete(actionId)
        next.add(resolvedId)
        return next
      })
      onNotify?.('Ndryshimet u ruajtuan me sukses.', 'success')

      const scope: InvalidateScope = result.itemsChanged ? 'all' : 'history'
      scheduleInvalidate(qc, scope, {
        actionBatchId: resolvedId,
        userId: user?.id,
      })
    },
    [qc, onNotify, user?.id],
  )

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteActionBatch(id),
    onSuccess: (_data, deletedId) => {
      setDeleteTarget(null)
      setExpandedIds((prev) => {
        const next = new Set(prev)
        next.delete(deletedId)
        return next
      })
      setEditActionId((id) => (id === deletedId ? null : id))
      onNotify?.('Veprimi u fshi me sukses.', 'success')
      scheduleInvalidate(qc, 'all', { userId: user?.id })
    },
    onError: (e) => {
      setDeleteTarget(null)
      setError(e instanceof Error ? e.message : 'Gabim gjate fshirjes.')
    },
  })

  const actions = listQuery.data?.actions ?? []
  const filteredActions = React.useMemo(
    () => applyHistoryClientFilters(actions, clientFilters, { trackPrice }),
    [actions, clientFilters, trackPrice],
  )
  const showClearLink =
    hasActiveServerFilters(filters) ||
    hasActiveClientFilters(clientFilters, { trackPrice })
  const tableColCount = trackPrice ? HISTORY_TABLE_COL_COUNT : HISTORY_TABLE_COL_COUNT - 1
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  const pageNumbers = React.useMemo(() => {
    const pages: number[] = []
    for (let i = 1; i <= totalPages; i += 1) pages.push(i)
    return pages
  }, [totalPages])

  const contentRef = React.useRef<HTMLDivElement>(null)
  useFocusModalOnOpen(contentRef, variant === 'modal')
  useEscapeToClose(onClose, { enabled: variant === 'modal' })

  const historyBody = (
    <div
      ref={contentRef}
      className={variant === 'embedded' ? 'history-embedded' : 'modal-content history-modal'}
      onClick={variant === 'modal' ? (e) => e.stopPropagation() : undefined}
    >
      <div className="history-modal-header">
        {variant === 'modal' ? <HistoryModalTitleRow onClose={onClose} /> : null}

        <DynamicHistoryFilterBar
              serverFilters={filters}
              clientFilters={clientFilters}
              locations={sortedLocations}
              onServerFilterChange={updateFilters}
              onClientFilterChange={updateClientFilters}
              onClearAll={clearAllFilters}
              showClearLink={showClearLink}
              showTotali={trackPrice}
            />
          </div>

          <div className="history-table-wrap history-table-wrap--fixed-body">
            <table className="table history-table">
              <colgroup>
                <col className="history-col-expand" />
                <col className="history-col-date" />
                <col className="history-col-ora" />
                <col className="history-col-pershkrimi" />
                <col className="history-col-lloji" />
                <col className="history-col-shteti" />
                <col className="history-col-products" />
                {trackPrice ? <col className="history-col-totali" /> : null}
                <col className="history-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th className="history-col-expand" />
                  <th className="history-col-date">Data</th>
                  <th className="history-col-ora">Ora</th>
                  <th className="history-col-pershkrimi">Pershkrimi</th>
                  <th className="history-col-lloji">Lloji</th>
                  <th className="history-col-shteti">Lokacioni</th>
                  <th className="history-col-products">Produkte</th>
                  {trackPrice ? <th className="history-col-totali">Totali</th> : null}
                  <th className="history-col-actions">Veprime</th>
                </tr>
              </thead>
              {isTableLoading ? (
                <HistorySkeletonTable />
              ) : listQuery.isError && !listQuery.data ? (
                <HistoryTableEmptyBody
                  colSpan={tableColCount}
                  message={
                    listQuery.error instanceof Error
                      ? listQuery.error.message
                      : 'Gabim gjate ngarkimit te historikut.'
                  }
                />
              ) : actions.length === 0 ? (
                <HistoryTableEmptyBody
                  colSpan={tableColCount}
                  message="Nuk u gjet asnje veprim."
                />
              ) : filteredActions.length === 0 ? (
                <HistoryTableEmptyBody
                  colSpan={tableColCount}
                  message="Asnjë rezultat"
                />
              ) : (
                <tbody key={page}>
                  {filteredActions.map((action) => {
                    const expanded = expandedIds.has(action.id)
                    return (
                      <React.Fragment key={action.id}>
                        <tr className={expanded ? 'history-row-expanded' : undefined}>
                          <td className="history-col-expand">
                            <button
                              type="button"
                              className={`history-expand-btn${expanded ? ' expanded' : ''}`}
                              aria-expanded={expanded}
                              aria-label={expanded ? 'Mbyll detajet' : 'Shfaq detajet'}
                              onMouseEnter={() => prefetchDetail(action.id)}
                              onFocus={() => prefetchDetail(action.id)}
                              onClick={() => toggleExpanded(action.id)}
                            >
                              <span className="history-expand-chevron" aria-hidden="true">
                                ›
                              </span>
                            </button>
                          </td>
                          <HistoryBatchMetaDisplay batch={action} matchedItems={action.matched_items} />
                          <td className="history-col-lloji">
                            <LlojiBadge lloji={action.lloji} />
                          </td>
                          <td className="history-col-shteti">
                            <DynamicLocationCell action={action} />
                          </td>
                          <td className="history-col-products">{action.item_count}</td>
                          {trackPrice ? (
                            <td className="history-col-totali">
                              <span className="num">{fmtEuro(action.totali)}</span>
                            </td>
                          ) : null}
                          <td className="history-col-actions history-row-actions">
                            <button
                              type="button"
                              className="btn sm ghost history-row-action-btn hover-tooltip"
                              data-tooltip="Bej ndryshime"
                              aria-label="Ndrysho veprimin"
                              onClick={() => {
                                setEditActionId(action.id)
                                setError(null)
                              }}
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              className="btn sm danger history-row-action-btn hover-tooltip"
                              data-tooltip="Fshij"
                              aria-label="Fshi veprimin"
                              onClick={() => {
                                setDeleteTarget(action)
                                setError(null)
                              }}
                            >
                              <DeleteIcon />
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="history-expanded-row">
                            <td colSpan={tableColCount}>
                              <ExpandedActionDetail
                                actionId={action.id}
                                highlightShenim={filters.shenim?.trim() || undefined}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                  <HistoryTablePadRows
                    count={PAGE_SIZE - filteredActions.length}
                    colSpan={tableColCount}
                  />
                </tbody>
              )}
            </table>
          </div>

          {error && (
            <div className="history-error" role="alert">
              {error}
            </div>
          )}

          {!isTableLoading && (
            <div className={`history-pagination${total > 0 ? '' : ' history-pagination--empty'}`}>
              <span className="history-pagination-summary">
                {total > 0
                  ? `Duke shfaqur ${rangeStart}–${rangeEnd} nga ${total} veprime`
                  : 'Duke shfaqur 0 veprime'}
              </span>
              <div className="history-pagination-controls">
                <button
                  type="button"
                  className="btn sm history-page-btn"
                  disabled={page <= 1 || total === 0}
                  aria-label="Faqja e meparshme"
                  onClick={() => {
                    setPage((p) => p - 1)
                    clearExpanded()
                  }}
                >
                  ‹
                </button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`btn sm history-page-btn${n === page ? ' active' : ''}`}
                    disabled={total === 0}
                    onClick={() => {
                      setPage(n)
                      clearExpanded()
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn sm history-page-btn"
                  disabled={page >= totalPages || total === 0}
                  aria-label="Faqja tjeter"
                  onClick={() => {
                    setPage((p) => p + 1)
                    clearExpanded()
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          )}
    </div>
  )

  return (
    <>
      {variant === 'modal' ? (
        <div className="modal-overlay" onClick={(e) => handleOverlayDismiss(e, onClose)}>
          {historyBody}
        </div>
      ) : (
        historyBody
      )}

      {editActionId && (
        <DynamicActionEditModal
          actionId={editActionId}
          products={products}
          onClose={() => setEditActionId(null)}
          onSaveComplete={(result) => handleEditSaveComplete(editActionId, result)}
          onError={setError}
          onNotify={onNotify}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Fshi veprimin?"
          message={
            <>
              A jeni i sigurt qe doni te fshini veprimin nga{' '}
              <strong>{formatDisplayDate(deleteTarget.data)}</strong>? Ky veprim eshte i
              pakthyeshëm dhe do te perditesoje gjendjen e stokut.
            </>
          }
          confirmLabel={deleteMut.isPending ? 'Duke fshire…' : 'Po, Fshi'}
          tone="danger"
          loading={deleteMut.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        />
      )}
    </>
  )
}
