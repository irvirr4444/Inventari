import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteActionBatch,
  getActionBatch,
  type ActionBatch,
  type Produkti,
} from '../../lib/api'
import {
  fmtEuro,
  formatDisplayDate,
} from '../../lib/format'
import {
  applyHistoryClientFilters,
  EMPTY_CLIENT_FILTERS,
  getHistoryFilterRangeIssues,
  hasActiveClientFilters,
  hasActiveServerFilters,
  mergeHistoryServerFilters,
  notifyHistoryFilterRangeIssues,
  type HistoryClientFilters,
  type HistoryServerFilters,
} from '../../lib/historyClientFilters'
import { scheduleInvalidate, type InvalidateScope } from '../../lib/invalidateAppData'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthProvider'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useFocusModalOnOpen } from '../../hooks/useFocusModalOnOpen'
import { useEscapeToClose } from '../../hooks/useEscapeToClose'
import { handleOverlayDismiss } from '../../lib/pointerDismissGuard'
import { ActionEditModal } from './ActionEditModal'
import type { HistoryEditSaveResult } from './historyEditSave'
import { ExpandedActionDetail } from './ExpandedActionDetail'
import { CountryCell, EditIcon, DeleteIcon, LlojiBadge } from './historyBadges'
import { HistoryBatchMetaDisplay } from './HistoryBatchMetaDisplay'
import { HistoryFilterBar } from './HistoryFilterBar'
import { HistoryModalTitleRow } from './HistoryModalTitleRow'
import { HistorySkeletonTable, HISTORY_TABLE_COL_COUNT } from './HistorySkeletonTable'
import { HistoryPagination } from './HistoryPagination'
import {
  HISTORY_MODAL_PAGE_SIZE,
  HistoryTableEmptyBody,
  HistoryTablePadRows,
} from './historyTableLayout'
import {
  historyListRefreshState,
  useHistoryBatchListQuery,
} from '../../hooks/useHistoryBatchListQuery'

const PAGE_SIZE = HISTORY_MODAL_PAGE_SIZE

export function HistoryModal(props: {
  products: Produkti[]
  onClose: () => void
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const { products, onClose, onNotify } = props
  const qc = useQueryClient()
  const { user } = useAuth()
  const [filters, setFilters] = React.useState<HistoryServerFilters>({})
  const [clientFilters, setClientFilters] =
    React.useState<HistoryClientFilters>(EMPTY_CLIENT_FILTERS)
  const [page, setPage] = React.useState(1)
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => new Set())
  const [editActionId, setEditActionId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ActionBatch | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const updateFilters = (patch: Partial<HistoryServerFilters>) => {
    const next = mergeHistoryServerFilters(filters, patch)
    const issues = getHistoryFilterRangeIssues(next, clientFilters)
    if (issues.length > 0) {
      notifyHistoryFilterRangeIssues(issues, onNotify)
      return
    }
    setFilters(next)
    setPage(1)
    setExpandedIds(new Set())
    setError(null)
  }

  const updateClientFilters = (patch: Partial<HistoryClientFilters>): boolean => {
    const next = { ...clientFilters, ...patch }
    const issues = getHistoryFilterRangeIssues(filters, next)
    if (issues.length > 0) {
      notifyHistoryFilterRangeIssues(issues, onNotify)
      return false
    }
    setClientFilters(next)
    setExpandedIds(new Set())
    return true
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
  const showSkeleton = isInitialLoad

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
    () => applyHistoryClientFilters(listQuery.data?.actions ?? [], clientFilters),
    [listQuery.data?.actions, clientFilters],
  )
  const showClearLink =
    hasActiveServerFilters(filters) || hasActiveClientFilters(clientFilters)
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const contentRef = React.useRef<HTMLDivElement>(null)
  useFocusModalOnOpen(contentRef, true)

  const handleEscape = React.useCallback(() => {
    if (expandedIds.size > 0) {
      clearExpanded()
      return
    }
    onClose()
  }, [expandedIds.size, onClose])

  useEscapeToClose(handleEscape)

  return (
    <>
      <div className="modal-overlay" onClick={(e) => handleOverlayDismiss(e, onClose)}>
        <div
          ref={contentRef}
          className="modal-content history-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="history-modal-header">
            <HistoryModalTitleRow onClose={onClose} />

            <HistoryFilterBar
              serverFilters={filters}
              clientFilters={clientFilters}
              onServerFilterChange={updateFilters}
              onClientFilterChange={updateClientFilters}
              onClearAll={clearAllFilters}
              showClearLink={showClearLink}
              onNotify={onNotify}
            />
          </div>

          <div
            className={`history-table-wrap history-table-wrap--fixed-body${isRefreshing ? ' history-table-wrap--refreshing' : ''}`}
          >
            {isRefreshing ? <div className="history-table-refresh-bar" aria-hidden="true" /> : null}
            <table className="table history-table">
              <colgroup>
                <col className="history-col-expand" />
                <col className="history-col-date" />
                <col className="history-col-ora" />
                <col className="history-col-pershkrimi" />
                <col className="history-col-lloji" />
                <col className="history-col-shteti" />
                <col className="history-col-products" />
                <col className="history-col-totali" />
                <col className="history-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th className="history-col-expand" />
                  <th className="history-col-date">Data</th>
                  <th className="history-col-ora">Ora</th>
                  <th className="history-col-pershkrimi">Përshkrimi</th>
                  <th className="history-col-lloji">Lloji</th>
                  <th className="history-col-shteti">Shteti</th>
                  <th className="history-col-products">Produkte</th>
                  <th className="history-col-totali">Totali</th>
                  <th className="history-col-actions">Veprime</th>
                </tr>
              </thead>
              {showSkeleton ? (
                <HistorySkeletonTable />
              ) : listQuery.isError && !listQuery.data ? (
                <HistoryTableEmptyBody
                  colSpan={HISTORY_TABLE_COL_COUNT}
                  message={
                    listQuery.error instanceof Error
                      ? listQuery.error.message
                      : 'Gabim gjate ngarkimit te historikut.'
                  }
                />
              ) : actions.length === 0 ? (
                <HistoryTableEmptyBody
                  colSpan={HISTORY_TABLE_COL_COUNT}
                  message="Nuk u gjet asnje veprim."
                />
              ) : filteredActions.length === 0 ? (
                <HistoryTableEmptyBody
                  colSpan={HISTORY_TABLE_COL_COUNT}
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
                          <HistoryBatchMetaDisplay
                            batch={action}
                            matchedItems={action.matched_items}
                          />
                          <td className="history-col-lloji">
                            <LlojiBadge lloji={action.lloji} />
                          </td>
                          <td className="history-col-shteti">
                            <CountryCell action={action} />
                          </td>
                          <td className="history-col-products">{action.item_count}</td>
                          <td className="history-col-totali">
                            <span className="num">{fmtEuro(action.totali)}</span>
                          </td>
                          <td className="history-col-actions history-row-actions">
                            <button
                              type="button"
                              className="btn sm history-row-action-btn hover-tooltip"
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
                              data-tooltip="Fshi"
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
                            <td colSpan={HISTORY_TABLE_COL_COUNT}>
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
                    colSpan={HISTORY_TABLE_COL_COUNT}
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

          {!showSkeleton && (
            <HistoryPagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={(nextPage) => {
                setPage(nextPage)
                clearExpanded()
              }}
            />
          )}
        </div>
      </div>

      {editActionId && (
        <ActionEditModal
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
