import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DeleteIcon, EditIcon } from '../../../../components/icons'
import type { ActionBatchDetail, DynamicProdukti, HistoryActionItem, Produkti } from '../../../../lib/api'
import { getActionBatch } from '../../../../lib/api'
import {
  batchTotal,
  itemChanged,
  lineTotal,
  rowsFromDetail,
  type HistoryEditRow,
} from '../../../../lib/historyBatchEdit'
import {
  createEmptyDynamicEditRow,
  dynamicMetaFromDetail,
  isDynamicHistoryEditDirty,
  saveDynamicHistoryBatchEdits,
  type DynamicHistoryBatchMetaDraft,
  type DynamicHistoryEditSnapshot,
} from '../../../../lib/dynamicHistoryBatchEdit'
import { fmtEuro, productLabel } from '../../../../lib/format'
import { formatActionDateTime } from '../../../../lib/actionMeta'
import { scheduleInvalidate } from '../../../../lib/invalidateAppData'
import { queryKeys } from '../../../../lib/queryKeys'
import { useAuth } from '../../../../lib/auth/AuthProvider'
import { useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { useTenantConfig } from '../../../../hooks/useTenantConfig'
import { BottomSheet } from '../../../../mobile/components/BottomSheet'
import { MobileActionReviewSheet } from '../../../../mobile/components/MobileActionReviewSheet'
import { ProductPickerSheet, type ProductPickerSaveData } from '../../../../mobile/components/ProductPickerSheet'
import { SheetActionFooter } from '../../../../mobile/components/SheetActions'
import { StickyCta } from '../../../../mobile/components/StickyCta'
import { MobileHistoriDetailPending } from '../../../../mobile/components/MobileHistoriDetailPending'
import type { MobileHeaderState } from '../../../../mobile/types'
import type { ActionItemDraft } from '../../../../types/actionItem'
import { DynamicHistoriActionMetaSheet } from '../components/DynamicHistoriActionMetaSheet'

type ProductChangeKind = 'unchanged' | 'modified' | 'new'

function MobileLlojiBadge(props: { lloji: ActionBatchDetail['lloji'] }) {
  const cls =
    props.lloji === 'Hyrje'
      ? 'mobile-badge-hyrje'
      : props.lloji === 'Dalje'
        ? 'mobile-badge-dalje'
        : 'mobile-badge-transfer'
  return <span className={`mobile-badge ${cls}`}>{props.lloji}</span>
}

function getProductChangeKind(
  row: HistoryEditRow,
  originalItems: HistoryActionItem[],
): ProductChangeKind {
  if (row.isNew) return 'new'
  const original = originalItems.find((item) => item.id === row.key)
  if (original && itemChanged(original, row.draft)) return 'modified'
  return 'unchanged'
}

function metaDraftEqual(a: DynamicHistoryBatchMetaDraft, b: DynamicHistoryBatchMetaDraft): boolean {
  return (
    a.data === b.data &&
    a.ora === b.ora &&
    a.pershkrimi === b.pershkrimi &&
    a.lokacioni_id === b.lokacioni_id &&
    a.destination_lokacioni_id === b.destination_lokacioni_id
  )
}

function DynamicHistoriDetailProductRow(props: {
  row: HistoryEditRow
  originalItem?: HistoryActionItem
  products: Produkti[]
  trackPrice: boolean
  changeKind: ProductChangeKind
  canRemove: boolean
  busy: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const product = props.products.find((p) => p.kodi === props.row.draft.kodi_produktit)
  const label = product
    ? productLabel(product.emri, product.kodi)
    : props.originalItem
      ? productLabel(props.originalItem.emri_produktit, props.originalItem.kodi_produktit)
      : props.row.draft.kodi_produktit || '—'
  const shenim = props.row.draft.shenim.trim()
  const qty = Number(props.row.draft.sasia) || 0
  const lineTotalValue = lineTotal(props.row.draft)

  return (
    <div
      className={[
        'mobile-row-card mobile-row-card-readonly dynamic-histori-detail-item',
        props.changeKind === 'new' ? 'dynamic-histori-detail-item--new' : '',
        props.changeKind === 'modified' ? 'dynamic-histori-detail-item--modified' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="mobile-row-card-body"
        role="button"
        tabIndex={props.busy ? -1 : 0}
        aria-disabled={props.busy}
        onClick={() => {
          if (!props.busy) props.onEdit()
        }}
        onKeyDown={(e) => {
          if (!props.busy && e.key === 'Enter') props.onEdit()
        }}
      >
        <div className="mobile-row-card-title-row">
          <div className="mobile-row-card-title">{label}</div>
          {props.changeKind === 'new' ? (
            <span className="dynamic-histori-detail-item-badge dynamic-histori-detail-item-badge--new">
              Shtuar
            </span>
          ) : props.changeKind === 'modified' ? (
            <span className="dynamic-histori-detail-item-badge dynamic-histori-detail-item-badge--modified">
              Ndryshuar
            </span>
          ) : null}
        </div>
        <div className="mobile-row-card-sub">
          {props.trackPrice ? (
            <>
              {fmtEuro(Number(props.row.draft.cmimi_njesi) || 0)} × {qty} cop
            </>
          ) : (
            <>{qty} cop</>
          )}
        </div>
        {props.trackPrice ? (
          <div className="mobile-row-card-total">Total: {fmtEuro(lineTotalValue)}</div>
        ) : null}
        {shenim ? (
          <div className="dynamic-histori-detail-item-shenim" title={shenim}>
            {shenim}
          </div>
        ) : null}
      </div>
      <div className="mobile-row-card-actions">
        <button
          type="button"
          className={`mobile-row-card-action-btn mobile-row-card-action-btn--edit${shenim ? ' has-note' : ''}`}
          aria-label="Ndrysho produktin"
          disabled={props.busy}
          onClick={(e) => {
            e.stopPropagation()
            props.onEdit()
          }}
        >
          <EditIcon />
        </button>
        <button
          type="button"
          className="mobile-row-card-action-btn mobile-row-card-action-btn--delete"
          aria-label="Fshi produktin"
          disabled={props.busy || !props.canRemove}
          onClick={(e) => {
            e.stopPropagation()
            props.onRemove()
          }}
        >
          <DeleteIcon />
        </button>
      </div>
    </div>
  )
}

export function DynamicHistoriBatchDetail(props: {
  batchId: string
  products: DynamicProdukti[]
  isActive: boolean
  onNotify: (message: string, variant?: 'success' | 'default' | 'error') => void
  onDeleteRequest: (batch: Pick<ActionBatchDetail, 'id' | 'lloji' | 'data'>) => void
  onHeaderChange: (header: MobileHeaderState) => void
  onBackToList: () => void
  onSaveSuccess?: () => void
}) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { trackPrice } = useTenantConfig()
  const { activeLokacionet } = useLokacioni()
  const sortedLocations = React.useMemo(
    () => [...activeLokacionet].sort((a, b) => a.rradhitja - b.rradhitja),
    [activeLokacionet],
  )
  const pickerProducts = props.products as unknown as Produkti[]

  const detailQuery = useQuery({
    queryKey: queryKeys.actionBatch(user?.id, props.batchId),
    queryFn: () => getActionBatch(props.batchId),
  })

  const detail = detailQuery.data

  const [initialSnapshot, setInitialSnapshot] = React.useState<DynamicHistoryEditSnapshot | null>(
    null,
  )
  const [draftMeta, setDraftMeta] = React.useState<DynamicHistoryBatchMetaDraft | null>(null)
  const [draftRows, setDraftRows] = React.useState<HistoryEditRow[]>([])
  const [actionMetaSheetOpen, setActionMetaSheetOpen] = React.useState(false)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [editingRowKey, setEditingRowKey] = React.useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [discardSheetOpen, setDiscardSheetOpen] = React.useState(false)

  React.useEffect(() => {
    if (!detail) return
    const snapshot: DynamicHistoryEditSnapshot = {
      meta: dynamicMetaFromDetail(detail),
      rows: rowsFromDetail(detail.items),
    }
    setInitialSnapshot(snapshot)
    setDraftMeta(snapshot.meta)
    setDraftRows(snapshot.rows)
  }, [detail?.id, detailQuery.dataUpdatedAt])

  const currentSnapshot = React.useMemo((): DynamicHistoryEditSnapshot | null => {
    if (!draftMeta) return null
    return { meta: draftMeta, rows: draftRows }
  }, [draftMeta, draftRows])

  const isDirty =
    initialSnapshot &&
    currentSnapshot &&
    isDynamicHistoryEditDirty(initialSnapshot, currentSnapshot)

  const isMetaDirty =
    initialSnapshot && draftMeta && !metaDraftEqual(initialSnapshot.meta, draftMeta)

  const { onHeaderChange, onBackToList } = props

  const requestBack = React.useCallback(() => {
    if (isDirty) {
      setDiscardSheetOpen(true)
    } else {
      onBackToList()
    }
  }, [isDirty, onBackToList])

  React.useEffect(() => {
    if (!props.isActive) return
    onHeaderChange({ kind: 'sub', title: 'Detajet', onBack: requestBack })
    return () => onHeaderChange({ kind: 'tab' })
  }, [props.isActive, requestBack, onHeaderChange])

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!detail || !draftMeta) throw new Error('Missing batch')
      return saveDynamicHistoryBatchEdits({
        detail,
        meta: draftMeta,
        rows: draftRows,
      })
    },
    onSuccess: (result) => {
      const prevBatchId = props.batchId
      const nextBatchId = result.batch_id ?? prevBatchId
      setReviewOpen(false)
      scheduleInvalidate(qc, 'all', { actionBatchId: nextBatchId, userId: user?.id })
      if (nextBatchId !== prevBatchId) {
        scheduleInvalidate(qc, 'history', { actionBatchId: prevBatchId, userId: user?.id })
        qc.removeQueries({ queryKey: queryKeys.actionBatch(user?.id, prevBatchId) })
      }
      qc.removeQueries({ queryKey: queryKeys.actionBatch(user?.id, nextBatchId) })
      props.onSaveSuccess?.()
      props.onNotify('Ndryshimet u ruajtuan me sukses.', 'success')
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : 'Gabim gjate ruajtjes.'
      props.onNotify(message, 'error')
    },
  })

  const openProductAdd = React.useCallback(() => {
    setEditingRowKey(null)
    setPickerOpen(true)
  }, [])

  const openProductEdit = React.useCallback((rowKey: string) => {
    setEditingRowKey(rowKey)
    setPickerOpen(true)
  }, [])

  const closeProductPicker = React.useCallback(() => {
    setPickerOpen(false)
    setEditingRowKey(null)
  }, [])

  const handleProductPickerSave = React.useCallback(
    (data: ProductPickerSaveData) => {
      if (editingRowKey) {
        setDraftRows((rows) =>
          rows.map((row) =>
            row.key === editingRowKey ? { ...row, draft: { ...row.draft, ...data } } : row,
          ),
        )
      } else {
        const newRow = createEmptyDynamicEditRow()
        setDraftRows((rows) => [
          ...rows,
          { ...newRow, draft: { ...newRow.draft, ...data } },
        ])
      }
      closeProductPicker()
    },
    [editingRowKey, closeProductPicker],
  )

  const handleProductRemove = React.useCallback((rowKey: string) => {
    setDraftRows((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.key !== rowKey)))
  }, [])

  if (detailQuery.isLoading || !draftMeta) {
    return <MobileHistoriDetailPending />
  }

  if (!detail) {
    return (
      <div className="mobile-tab-panel">
        <div className="mobile-inline-error">Nuk u gjet veprimi.</div>
      </div>
    )
  }

  const busy = saveMut.isPending
  const loc = sortedLocations.find((l) => l.id === draftMeta.lokacioni_id)
  const dest = sortedLocations.find((l) => l.id === draftMeta.destination_lokacioni_id)
  const locLabel = loc?.emri ?? detail.lokacioni_emri
  const destLabel = dest?.emri ?? detail.destination_lokacioni_emri
  const pershkrimi = draftMeta.pershkrimi.trim()
  const dateTime = formatActionDateTime(draftMeta.data, draftMeta.ora)
  const batchSummary = trackPrice ? `Total: ${fmtEuro(batchTotal(draftRows))}` : null
  const editingRow = editingRowKey ? draftRows.find((row) => row.key === editingRowKey) : null
  const canRemoveProducts = draftRows.length > 1

  const reviewItems: ActionItemDraft[] = draftRows.map((row) => ({
    key: row.key,
    kodi_produktit: row.draft.kodi_produktit,
    cmimi_njesi: row.draft.cmimi_njesi,
    sasia: row.draft.sasia,
    shenim: row.draft.shenim,
  }))

  const reviewSheetProps =
    detail.lloji === 'Transfer'
      ? {
          lloji: 'Transfer' as const,
          transferFromLocation: {
            emri: loc?.emri ?? '—',
            flagEmoji: loc?.flag_emoji,
          },
          transferToLocation: {
            emri: dest?.emri ?? '—',
            flagEmoji: dest?.flag_emoji,
          },
        }
      : {
          lloji: detail.lloji,
          location: {
            emri: loc?.emri ?? '—',
            flagEmoji: loc?.flag_emoji,
          },
        }

  return (
    <>
        <div className={`mobile-tab-panel dynamic-histori-detail-panel mobile-panel-enter${isDirty ? ' dynamic-histori-detail-panel--dirty' : ''}`}>
        <div className="dynamic-histori-detail-section">
          <div className="dynamic-histori-detail-section-head">
            <div className="mobile-section-label">Veprimi</div>
            <div className="mobile-row-card-actions">
              <button
                type="button"
                className="mobile-row-card-action-btn mobile-row-card-action-btn--edit"
                aria-label="Ndrysho veprimin"
                disabled={busy}
                onClick={() => setActionMetaSheetOpen(true)}
              >
                <EditIcon />
              </button>
              <button
                type="button"
                className="mobile-row-card-action-btn mobile-row-card-action-btn--delete"
                aria-label="Fshi veprimin"
                disabled={busy}
                onClick={() =>
                  props.onDeleteRequest({ id: detail.id, lloji: detail.lloji, data: detail.data })
                }
              >
                <DeleteIcon />
              </button>
            </div>
          </div>

          <div
            className={[
              'mobile-row-card mobile-histori-row-card mobile-histori-row-card--static',
              isMetaDirty ? 'dynamic-histori-detail-action-card--dirty' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="mobile-histori-row-card__header">
              <MobileLlojiBadge lloji={detail.lloji} />
              <span className="mobile-histori-row-card__datetime">{dateTime}</span>
              {isMetaDirty ? (
                <span className="dynamic-histori-detail-item-badge dynamic-histori-detail-item-badge--modified">
                  Ndryshuar
                </span>
              ) : null}
            </div>

            {detail.lloji === 'Transfer' && destLabel ? (
              <div className="mobile-histori-row-card__route">
                <span className="mobile-histori-row-card__location">
                  <span className="mobile-histori-row-card__emoji" aria-hidden>
                    {loc?.flag_emoji ?? detail.flag_emoji ?? '📍'}
                  </span>
                  <span className="mobile-histori-row-card__location-name">{locLabel ?? '—'}</span>
                </span>
                <span className="mobile-histori-row-card__route-arrow" aria-hidden>
                  →
                </span>
                <span className="mobile-histori-row-card__location">
                  <span className="mobile-histori-row-card__emoji" aria-hidden>
                    {dest?.flag_emoji ?? detail.destination_flag_emoji ?? '📍'}
                  </span>
                  <span className="mobile-histori-row-card__location-name">{destLabel}</span>
                </span>
              </div>
            ) : (
              <div className="mobile-histori-row-card__route">
                <span className="mobile-histori-row-card__location">
                  <span className="mobile-histori-row-card__emoji" aria-hidden>
                    {loc?.flag_emoji ?? detail.flag_emoji ?? '📍'}
                  </span>
                  <span className="mobile-histori-row-card__location-name">{locLabel ?? '—'}</span>
                </span>
              </div>
            )}

            {batchSummary || pershkrimi ? (
              <div className="mobile-histori-row-card__footer" title={pershkrimi || undefined}>
                {batchSummary ? (
                  <span className="mobile-histori-row-card__summary">{batchSummary}</span>
                ) : null}
                {pershkrimi ? (
                  <span className="mobile-histori-row-card__pershkrimi">
                    <span className="mobile-histori-row-card__pershkrimi-text">{pershkrimi}</span>
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="dynamic-histori-detail-section">
          <div className="mobile-section-label">Produktet</div>
          <button
            type="button"
            className="mobile-btn-outline dynamic-histori-add-product-btn"
            disabled={busy}
            onClick={openProductAdd}
          >
            + Shto produkt
          </button>

          <div className="mobile-list-stack">
            {draftRows.map((row) => (
              <DynamicHistoriDetailProductRow
                key={row.key}
                row={row}
                originalItem={detail.items.find((item) => item.id === row.key)}
                products={pickerProducts}
                trackPrice={trackPrice}
                changeKind={getProductChangeKind(row, detail.items)}
                canRemove={canRemoveProducts}
                busy={busy}
                onEdit={() => openProductEdit(row.key)}
                onRemove={() => handleProductRemove(row.key)}
              />
            ))}
          </div>
        </div>
      </div>

      {isDirty ? (
        <StickyCta
          label="FINALIZO NDRYSHIMET"
          loading={saveMut.isPending}
          onClick={() => setReviewOpen(true)}
        />
      ) : null}

      <DynamicHistoriActionMetaSheet
        open={actionMetaSheetOpen}
        detail={detail}
        locations={sortedLocations}
        busy={false}
        onClose={() => setActionMetaSheetOpen(false)}
        onSave={(meta) => {
          setDraftMeta(meta)
          setActionMetaSheetOpen(false)
        }}
        onNotify={props.onNotify}
      />

      <ProductPickerSheet
        open={pickerOpen}
        title={editingRowKey ? 'Ndrysho produktin' : 'Shto produkt'}
        products={pickerProducts}
        showPrice={trackPrice}
        initial={
          editingRow
            ? {
                kodi_produktit: editingRow.draft.kodi_produktit,
                cmimi_njesi: editingRow.draft.cmimi_njesi,
                sasia: editingRow.draft.sasia,
                shenim: editingRow.draft.shenim,
              }
            : undefined
        }
        onClose={closeProductPicker}
        onSave={handleProductPickerSave}
      />

      <MobileActionReviewSheet
        open={reviewOpen}
        {...reviewSheetProps}
        items={reviewItems}
        products={props.products}
        total={batchTotal(draftRows)}
        actionDate={draftMeta.data}
        actionOra={draftMeta.ora}
        actionPershkrimi={draftMeta.pershkrimi}
        showPrice={trackPrice}
        title="Finalizo ndryshimet?"
        confirmLabel={saveMut.isPending ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
        totalLabel="Totali i veprimit"
        loading={saveMut.isPending}
        onCancel={() => setReviewOpen(false)}
        onConfirm={() => saveMut.mutate()}
      />

      <BottomSheet
        open={discardSheetOpen}
        title="Ke ndryshime të paruajtura."
        onClose={() => setDiscardSheetOpen(false)}
        footer={
          <SheetActionFooter
            cancelLabel="Vazhdo"
            confirmLabel="Mbyll pa ruajtur"
            confirmVariant="danger"
            confirmIcon="delete"
            onCancel={() => setDiscardSheetOpen(false)}
            onConfirm={() => {
              setDiscardSheetOpen(false)
              onBackToList()
            }}
          />
        }
      >
        <p className="mobile-card-meta">Ndryshimet do të humbasin nëse mbyll pa ruajtur.</p>
      </BottomSheet>
    </>
  )
}
