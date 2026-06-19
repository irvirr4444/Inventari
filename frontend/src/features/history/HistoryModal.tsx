import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Country } from '../../lib/country'
import {
  deleteActionBatch,
  getActionBatch,
  listActionBatches,
  type ActionBatch,
  type Produkti,
} from '../../lib/api'
import {
  fmtEuro,
  formatDisplayDate,
} from '../../lib/format'
import { invalidateAfterMutation } from '../../lib/invalidateAppData'
import { queryKeys } from '../../lib/queryKeys'
import { ConfirmModal } from '../../components/ConfirmModal'
import { DateInput } from '../../components/DateInput'
import { ActionEditModal } from './ActionEditModal'
import { ExpandedActionDetail } from './ExpandedActionDetail'
import { CountryCell, EditIcon, DeleteIcon, LlojiBadge } from './historyBadges'
import { HistoryBatchMetaDisplay } from './HistoryBatchMetaDisplay'
import { HistorySkeletonTable, HISTORY_TABLE_COL_COUNT } from './HistorySkeletonTable'

type FilterState = {
  lloji?: 'Hyrje' | 'Dalje' | 'Transfer'
  shteti?: Country
  dateFrom?: string
  dateTo?: string
}

const PAGE_SIZE = 8

export function HistoryModal(props: {
  products: Produkti[]
  onClose: () => void
  onNotify?: (message: string, variant?: 'success' | 'default') => void
}) {
  const { products, onClose, onNotify } = props
  const qc = useQueryClient()
  const [filters, setFilters] = React.useState<FilterState>({})
  const [page, setPage] = React.useState(1)
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => new Set())
  const [editActionId, setEditActionId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ActionBatch | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const updateFilters = (patch: Partial<FilterState>) => {
    setFilters((prev) => {
      const next = { ...prev }
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '') {
          delete next[key as keyof FilterState]
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

  const listQuery = useQuery({
    queryKey: [...queryKeys.actionBatches(filters), page],
    queryFn: () =>
      listActionBatches({
        ...filters,
        page,
        limit: PAGE_SIZE,
      }),
  })

  const prefetchDetail = React.useCallback(
    (actionId: string) => {
      void qc.prefetchQuery({
        queryKey: queryKeys.actionBatch(actionId),
        queryFn: () => getActionBatch(actionId),
        staleTime: 30_000,
      })
    },
    [qc],
  )

  const handleEditSaveComplete = React.useCallback(
    async (actionId: string) => {
      setEditActionId(null)
      setExpandedIds((prev) => {
        const next = new Set(prev)
        next.add(actionId)
        return next
      })
      await invalidateAfterMutation(qc, 'all', { actionBatchId: actionId })
      await listQuery.refetch()
      onNotify?.('Ndryshimet u ruajtuan me sukses.', 'success')
    },
    [qc, listQuery, onNotify],
  )

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteActionBatch(id),
    onSuccess: async (_data, deletedId) => {
      setDeleteTarget(null)
      setExpandedIds((prev) => {
        const next = new Set(prev)
        next.delete(deletedId)
        return next
      })
      setEditActionId((id) => (id === deletedId ? null : id))
      await invalidateAfterMutation(qc, 'all')
      await listQuery.refetch()
      onNotify?.('Veprimi u fshi me sukses.', 'success')
    },
    onError: (e) => {
      setDeleteTarget(null)
      setError(e instanceof Error ? e.message : 'Gabim gjate fshirjes.')
    },
  })

  const actions = listQuery.data?.actions ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  const pageNumbers = React.useMemo(() => {
    const pages: number[] = []
    for (let i = 1; i <= totalPages; i += 1) pages.push(i)
    return pages
  }, [totalPages])

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
          <div className="history-modal-header">
            <div className="history-title-row">
              <svg
                className="history-title-icon"
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <h3>Historiku i Veprimeve</h3>
              <div className="spacer" />
              <button
                type="button"
                className="modal-close-btn"
                onClick={onClose}
                aria-label="Mbyll"
              >
                ×
              </button>
            </div>

            <div className="history-filters-stack">
              <DateInput
                className="history-filter-date"
                value={filters.dateFrom ?? ''}
                placeholder="Nga data"
                onChange={(v) => updateFilters({ dateFrom: v || undefined })}
              />
              <span className="history-date-sep" aria-hidden="true">
                —
              </span>
              <DateInput
                className="history-filter-date"
                value={filters.dateTo ?? ''}
                placeholder="Deri"
                onChange={(v) => updateFilters({ dateTo: v || undefined })}
              />
              <select
                className="select history-filter-select"
                value={filters.lloji ?? ''}
                onChange={(e) =>
                  updateFilters({
                    lloji: (e.target.value || undefined) as FilterState['lloji'],
                  })
                }
              >
                <option value="">Te gjitha llojet</option>
                <option value="Hyrje">Hyrje</option>
                <option value="Dalje">Dalje</option>
                <option value="Transfer">Transfer</option>
              </select>
              <select
                className="select history-filter-select"
                value={filters.shteti ?? ''}
                onChange={(e) =>
                  updateFilters({
                    shteti: (e.target.value || undefined) as Country | undefined,
                  })
                }
              >
                <option value="">Te gjitha shtetet</option>
                <option value="XK">Kosove</option>
                <option value="AL">Shqiperi</option>
              </select>
            </div>
          </div>

          <div className="history-table-wrap">
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
                  <th className="history-col-pershkrimi">Pershkrimi</th>
                  <th className="history-col-lloji">Lloji</th>
                  <th className="history-col-shteti">Shteti</th>
                  <th className="history-col-products">Produkte</th>
                  <th className="history-col-totali">Totali</th>
                  <th className="history-col-actions">Veprime</th>
                </tr>
              </thead>
              {listQuery.isLoading ? (
                <HistorySkeletonTable />
              ) : listQuery.isError ? (
                <tbody>
                  <tr>
                    <td colSpan={HISTORY_TABLE_COL_COUNT} className="history-empty-cell">
                      <p className="muted">
                        {listQuery.error instanceof Error
                          ? listQuery.error.message
                          : 'Gabim gjate ngarkimit te historikut.'}
                      </p>
                    </td>
                  </tr>
                </tbody>
              ) : actions.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={HISTORY_TABLE_COL_COUNT} className="history-empty-cell">
                      <p className="muted">Nuk u gjet asnje veprim.</p>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {actions.map((action) => {
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
                          <HistoryBatchMetaDisplay batch={action} />
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
                              className="btn sm ghost history-row-action-btn"
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
                              className="btn sm danger history-row-action-btn"
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
                              <ExpandedActionDetail actionId={action.id} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              )}
            </table>
          </div>

          {error && (
            <div className="history-error" role="alert">
              {error}
            </div>
          )}

          {total > 0 && (
            <div className="history-pagination">
              <span className="history-pagination-summary">
                Duke shfaqur {rangeStart}–{rangeEnd} nga {total} veprime
              </span>
              <div className="history-pagination-controls">
                <button
                  type="button"
                  className="btn sm history-page-btn"
                  disabled={page <= 1}
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
                  disabled={page >= totalPages}
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
      </div>

      {editActionId && (
        <ActionEditModal
          actionId={editActionId}
          products={products}
          onClose={() => setEditActionId(null)}
          onSaveComplete={() => void handleEditSaveComplete(editActionId)}
          onError={setError}
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
