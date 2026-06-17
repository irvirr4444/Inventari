import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { COUNTRY_META, type Country } from '../lib/country'
import {
  deleteActionBatch,
  getActionBatch,
  listActionBatches,
  updateActionBatch,
  updateActionBatchItem,
  type ActionBatch,
  type ActionBatchDetail,
  type HistoryActionItem,
  type Produkti,
} from '../lib/api'
import {
  countryHistoryLabel,
  fmtEuro,
  formatDisplayDate,
  productCountLabel,
  productLabel,
  sortProductsByKodi,
} from '../lib/format'
import { ConfirmModal } from './ConfirmModal'
import { DateInput } from './DateInput'

type FilterState = {
  lloji?: 'Hyrje' | 'Dalje' | 'Transfer'
  shteti?: Country
  dateFrom?: string
  dateTo?: string
}

const PAGE_SIZE = 5

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

function LlojiBadge(props: { lloji: ActionBatch['lloji'] }) {
  if (props.lloji === 'Hyrje') {
    return (
      <span className="history-pill history-pill-hyrje">
        <span aria-hidden="true">↑</span> Hyrje
      </span>
    )
  }
  if (props.lloji === 'Dalje') {
    return (
      <span className="history-pill history-pill-dalje">
        <span aria-hidden="true">↑</span> Dalje
      </span>
    )
  }
  return (
    <span className="history-pill history-pill-transfer">
      <span aria-hidden="true">⇌</span> Transfer
    </span>
  )
}

function CountryCell(props: { action: ActionBatch }) {
  if (props.action.lloji === 'Transfer' && props.action.destination_shteti) {
    const from = COUNTRY_META[props.action.shteti]
    const to = COUNTRY_META[props.action.destination_shteti]
    return (
      <span className="history-country">
        <img className="flagIcon" src={from.flagSrc} alt="" />
        <span>{countryHistoryLabel(props.action.shteti)}</span>
        <span className="history-country-arrow">→</span>
        <span>{countryHistoryLabel(props.action.destination_shteti)}</span>
        <img className="flagIcon" src={to.flagSrc} alt="" />
      </span>
    )
  }

  const meta = COUNTRY_META[props.action.shteti]
  return (
    <span className="history-country">
      <img className="flagIcon" src={meta.flagSrc} alt="" />
      <span>{countryHistoryLabel(props.action.shteti)}</span>
    </span>
  )
}

function ActionReadOnlyPanel(props: { detail: ActionBatchDetail }) {
  const total = props.detail.items.reduce((sum, it) => sum + it.totali, 0)
  return (
    <div className="history-expanded-panel">
      <table className="table table-fixed history-subtable">
        <colgroup>
          <col style={{ width: '38%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '28%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Produkti</th>
            <th className="history-subtable-money">Cmimi/Njesi</th>
            <th className="history-subtable-qty">Sasia</th>
            <th className="history-subtable-money">Totali</th>
          </tr>
        </thead>
        <tbody>
          {props.detail.items.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="history-product-cell">
                  {productLabel(item.emri_produktit, item.kodi_produktit)}
                </span>
              </td>
              <td className="history-subtable-money">{fmtEuro(item.cmimi_njesi)}</td>
              <td className="history-subtable-qty">{item.sasia}</td>
              <td className="history-subtable-money">
                <span className="num">{fmtEuro(item.totali)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="history-expanded-total">
        Totali i veprimit: <strong>{fmtEuro(total)}</strong>
      </div>
    </div>
  )
}

type EditSaveKind = 'action' | 'product'

function ActionEditForm(props: {
  detail: ActionBatchDetail
  products: Produkti[]
  disabled: boolean
  onSaveComplete: (kind: EditSaveKind) => void
  onError: (message: string) => void
}) {
  const qc = useQueryClient()
  const [data, setData] = React.useState(props.detail.data)
  const [shteti, setShteti] = React.useState<Country>(props.detail.shteti)
  const [destination, setDestination] = React.useState<Country | ''>(
    props.detail.destination_shteti ?? '',
  )
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null)
  const [editDraft, setEditDraft] = React.useState<{
    kodi_produktit: string
    cmimi_njesi: string
    sasia: string
  } | null>(null)
  const localItems = props.detail.items
  const productsByKodi = React.useMemo(
    () => sortProductsByKodi(props.products),
    [props.products],
  )

  const invalidateAll = React.useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['action-batches'] }),
      qc.invalidateQueries({ queryKey: ['action-batch', props.detail.id] }),
      qc.invalidateQueries({ queryKey: ['products'] }),
      qc.invalidateQueries({ queryKey: ['analytics-summary'] }),
    ])
  }, [qc, props.detail.id])

  const updateBatchMut = useMutation({
    mutationFn: () => {
      const payload: {
        data?: string
        shteti?: Country
        destination_shteti?: Country
      } = { data }
      if (props.detail.lloji === 'Transfer') {
        payload.shteti = shteti
        if (destination) payload.destination_shteti = destination as Country
      } else if (!props.detail.mirrored_to_albania) {
        payload.shteti = shteti
      }
      return updateActionBatch(props.detail.id, payload)
    },
    onSuccess: async () => {
      await invalidateAll()
      props.onSaveComplete('action')
    },
    onError: (e) => props.onError(e instanceof Error ? e.message : 'Error'),
  })

  const updateItemMut = useMutation({
    mutationFn: (itemId: string) => {
      if (!editDraft) throw new Error('Missing draft')
      return updateActionBatchItem(props.detail.id, itemId, {
        kodi_produktit: editDraft.kodi_produktit,
        cmimi_njesi: Number(editDraft.cmimi_njesi) || 0,
        sasia: Number(editDraft.sasia) || 0,
      })
    },
    onSuccess: async () => {
      setEditingItemId(null)
      setEditDraft(null)
      await invalidateAll()
      props.onSaveComplete('product')
    },
    onError: (e) => props.onError(e instanceof Error ? e.message : 'Error'),
  })

  const startEditItem = (item: HistoryActionItem) => {
    setEditingItemId(item.id)
    setEditDraft({
      kodi_produktit: item.kodi_produktit,
      cmimi_njesi: String(item.cmimi_njesi),
      sasia: String(item.sasia),
    })
  }

  const saveEditItem = (itemId: string) => {
    if (!editDraft) return
    if (!editDraft.kodi_produktit) {
      props.onError('Zgjidh produktin.')
      return
    }
    if (Number(editDraft.sasia) <= 0) {
      props.onError('Sasia duhet te jete > 0.')
      return
    }
    const duplicateProduct = localItems.find(
      (it) => it.id !== itemId && it.kodi_produktit === editDraft.kodi_produktit,
    )
    if (duplicateProduct) {
      props.onError(
        `Ky produkt eshte tashme ne liste: ${productLabel(
          duplicateProduct.emri_produktit,
          duplicateProduct.kodi_produktit,
        )}`,
      )
      return
    }
    updateItemMut.mutate(itemId)
  }

  const updateFrom = (next: Country) => {
    setShteti(next)
    if (props.detail.lloji === 'Transfer' && next === destination) {
      setDestination(next === 'XK' ? 'AL' : 'XK')
    }
  }

  const displayItems =
    editingItemId && editDraft
      ? localItems.map((it) =>
          it.id === editingItemId
            ? {
                ...it,
                kodi_produktit: editDraft.kodi_produktit,
                cmimi_njesi: Number(editDraft.cmimi_njesi) || 0,
                sasia: Number(editDraft.sasia) || 0,
                totali:
                  (Number(editDraft.cmimi_njesi) || 0) * (Number(editDraft.sasia) || 0),
              }
            : it,
        )
      : localItems

  const actionTotal = displayItems.reduce((sum, it) => sum + it.totali, 0)
  const busy = props.disabled || updateBatchMut.isPending || updateItemMut.isPending

  return (
    <>
      <div className="history-detail-meta">
        <div className="form-group">
          <label className="label">Data</label>
          <DateInput value={data} onChange={setData} disabled={busy} />
        </div>

        {props.detail.lloji === 'Transfer' ? (
          <>
            <div className="form-group">
              <label className="label">Nga</label>
              <select
                className="select"
                value={shteti}
                disabled={busy}
                onChange={(e) => updateFrom(e.target.value as Country)}
              >
                <option value="XK">Kosove</option>
                <option value="AL">Shqiperi</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Ne</label>
              <select
                className="select"
                value={destination}
                disabled={busy}
                onChange={(e) => setDestination(e.target.value as Country)}
              >
                <option value="XK" disabled={shteti === 'XK'}>
                  Kosove
                </option>
                <option value="AL" disabled={shteti === 'AL'}>
                  Shqiperi
                </option>
              </select>
            </div>
          </>
        ) : (
          <div className="form-group">
            <label className="label">Shteti</label>
            <select
              className="select"
              value={shteti}
              disabled={busy || props.detail.mirrored_to_albania}
              onChange={(e) => setShteti(e.target.value as Country)}
            >
              <option value="XK">Kosove</option>
              <option value="AL">Shqiperi</option>
            </select>
          </div>
        )}

        <div className="form-group history-meta-save">
          <label className="label" aria-hidden="true">
            &nbsp;
          </label>
          <button
            type="button"
            className="btn sm primary"
            disabled={busy}
            onClick={() => updateBatchMut.mutate()}
          >
            {updateBatchMut.isPending ? 'Duke ruajtur…' : 'Ruaj'}
          </button>
        </div>
      </div>

      <table className="table table-fixed history-subtable">
        <colgroup>
          <col style={{ width: '28%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '24%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Produkti</th>
            <th className="history-subtable-money">Cmimi/Njesi</th>
            <th className="history-subtable-qty">Sasia</th>
            <th className="history-subtable-money">Totali</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item) => {
            const isEditing = editingItemId === item.id
            return (
              <tr key={item.id} className={isEditing ? 'item-row-editing' : undefined}>
                <td>
                  {isEditing && editDraft ? (
                    <select
                      className="select history-subtable-input"
                      value={editDraft.kodi_produktit}
                      disabled={busy}
                      onChange={(e) =>
                        setEditDraft((d) => d && { ...d, kodi_produktit: e.target.value })
                      }
                    >
                      <option value="">Zgjedh produktin…</option>
                      {productsByKodi.map((p) => (
                        <option
                          key={p.id}
                          value={p.kodi}
                          disabled={localItems.some(
                            (x) => x.id !== item.id && x.kodi_produktit === p.kodi,
                          )}
                        >
                          {productLabel(p.emri, p.kodi)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="history-product-cell">
                      {productLabel(item.emri_produktit, item.kodi_produktit)}
                    </span>
                  )}
                </td>
                <td className="history-subtable-money">
                  {isEditing && editDraft ? (
                    <input
                      className="input history-subtable-input"
                      type="number"
                      step="0.01"
                      min={0}
                      disabled={busy}
                      value={editDraft.cmimi_njesi}
                      onChange={(e) =>
                        setEditDraft((d) => d && { ...d, cmimi_njesi: e.target.value })
                      }
                    />
                  ) : (
                    <span className="num">{fmtEuro(item.cmimi_njesi)}</span>
                  )}
                </td>
                <td className="history-subtable-qty">
                  {isEditing && editDraft ? (
                    <input
                      className="input history-subtable-input"
                      type="number"
                      min={1}
                      disabled={busy}
                      value={editDraft.sasia}
                      onChange={(e) =>
                        setEditDraft((d) => d && { ...d, sasia: e.target.value })
                      }
                    />
                  ) : (
                    item.sasia
                  )}
                </td>
                <td className="history-subtable-money">
                  <span className="num">{fmtEuro(item.totali)}</span>
                </td>
                <td className="history-subtable-actions">
                  {isEditing ? (
                    <div className="history-subtable-action-group">
                      <button
                        type="button"
                        className="btn sm primary"
                        disabled={busy}
                        onClick={() => saveEditItem(item.id)}
                      >
                        Ruaj
                      </button>
                      <button
                        type="button"
                        className="btn sm"
                        disabled={busy}
                        onClick={() => {
                          setEditingItemId(null)
                          setEditDraft(null)
                        }}
                      >
                        Anulo
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn sm ghost history-edit-product-btn"
                        disabled={busy}
                        aria-label="Ndrysho produktin"
                        onClick={() => startEditItem(item)}
                      >
                        <span aria-hidden="true">✎</span> Ndrysho Produktin
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="history-edit-modal-footer">
        <div className="history-expanded-total">
          Totali i veprimit: <strong>{fmtEuro(actionTotal)}</strong>
        </div>
      </div>
    </>
  )
}

function ActionEditModal(props: {
  actionId: string
  products: Produkti[]
  onClose: () => void
  onSaveComplete: (kind: EditSaveKind) => void
  onError: (message: string) => void
}) {
  const detailQuery = useQuery({
    queryKey: ['action-batch', props.actionId],
    queryFn: () => getActionBatch(props.actionId),
  })

  return (
    <div className="modal-overlay history-edit-overlay" onClick={props.onClose}>
      <div className="modal-content history-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-edit-modal-header">
          <h3>Ndrysho Veprimin</h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={props.onClose}
            aria-label="Mbyll"
          >
            ×
          </button>
        </div>

        {detailQuery.isLoading ? (
          <div className="history-skeleton-block" style={{ height: 120, margin: '16px 0' }} />
        ) : detailQuery.isError ? (
          <p className="muted" style={{ margin: '16px 0' }}>
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'Gabim gjate ngarkimit.'}
          </p>
        ) : detailQuery.data ? (
          <ActionEditForm
            key={`${props.actionId}-${detailQuery.dataUpdatedAt}`}
            detail={detailQuery.data}
            products={props.products}
            disabled={detailQuery.isFetching}
            onSaveComplete={props.onSaveComplete}
            onError={props.onError}
          />
        ) : null}
      </div>
    </div>
  )
}

function ExpandedActionDetail(props: { actionId: string }) {
  const detailQuery = useQuery({
    queryKey: ['action-batch', props.actionId],
    queryFn: () => getActionBatch(props.actionId),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  if (detailQuery.isLoading && !detailQuery.data) {
    return (
      <div className="history-expanded-panel">
        <div className="history-skeleton-block" />
      </div>
    )
  }

  if (detailQuery.isError) {
    return (
      <div className="history-expanded-panel">
        <p className="muted">
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : 'Gabim gjate ngarkimit te detajeve.'}
        </p>
      </div>
    )
  }

  if (detailQuery.data) {
    return <ActionReadOnlyPanel detail={detailQuery.data} />
  }

  return null
}

function HistorySkeletonTable() {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="history-skeleton-row">
          <td colSpan={7}>
            <div className="history-skeleton-block" />
          </td>
        </tr>
      ))}
    </tbody>
  )
}

export function HistoryModal(props: {
  products: Produkti[]
  onClose: () => void
  onNotify?: (message: string, variant?: 'success' | 'default') => void
}) {
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
    queryKey: ['action-batches', filters, page],
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
        queryKey: ['action-batch', actionId],
        queryFn: () => getActionBatch(actionId),
        staleTime: 30_000,
      })
    },
    [qc],
  )

  const handleEditSaveComplete = React.useCallback(
    async (actionId: string, kind: EditSaveKind) => {
      setEditActionId(null)
      setExpandedIds((prev) => {
        const next = new Set(prev)
        next.add(actionId)
        return next
      })
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['action-batches'] }),
        qc.invalidateQueries({ queryKey: ['action-batch', actionId] }),
        qc.invalidateQueries({ queryKey: ['products'] }),
        qc.invalidateQueries({ queryKey: ['analytics-summary'] }),
      ])
      await listQuery.refetch()
      props.onNotify?.(
        kind === 'product'
          ? 'Produkti u perditesua me sukses.'
          : 'Veprimi u perditesua me sukses.',
        'success',
      )
    },
    [qc, listQuery, props.onNotify],
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
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['action-batches'] }),
        qc.invalidateQueries({ queryKey: ['products'] }),
        qc.invalidateQueries({ queryKey: ['analytics-summary'] }),
      ])
      await listQuery.refetch()
      props.onNotify?.('Veprimi u fshi me sukses.', 'success')
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
      <div className="modal-overlay" onClick={props.onClose}>
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
                onClick={props.onClose}
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
              <thead>
                <tr>
                  <th className="history-col-expand" />
                  <th>Data</th>
                  <th>Lloji</th>
                  <th>Shteti</th>
                  <th>Produktet</th>
                  <th style={{ textAlign: 'right' }}>Totali</th>
                  <th className="history-col-actions">Veprime</th>
                </tr>
              </thead>
              {listQuery.isLoading ? (
                <HistorySkeletonTable />
              ) : listQuery.isError ? (
                <tbody>
                  <tr>
                    <td colSpan={7} className="history-empty-cell">
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
                    <td colSpan={7} className="history-empty-cell">
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
                          <td>{formatDisplayDate(action.data)}</td>
                          <td>
                            <LlojiBadge lloji={action.lloji} />
                          </td>
                          <td>
                            <CountryCell action={action} />
                          </td>
                          <td>{productCountLabel(action.item_count)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="num">{fmtEuro(action.totali)}</span>
                          </td>
                          <td className="history-row-actions">
                            <button
                              type="button"
                              className="btn sm ghost history-row-action-btn"
                              aria-label="Ndrysho veprimin"
                              onClick={() => {
                                setEditActionId(action.id)
                                setError(null)
                              }}
                            >
                              <EditIcon /> Ndrysho
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
                              <DeleteIcon /> Fshi
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="history-expanded-row">
                            <td colSpan={7}>
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
          products={props.products}
          onClose={() => setEditActionId(null)}
          onSaveComplete={(kind) => void handleEditSaveComplete(editActionId, kind)}
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
