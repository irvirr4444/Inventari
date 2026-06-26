import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DeleteIcon, EditIcon } from '../../../../components/icons'
import type { ActionBatchDetail, DynamicProdukti, HistoryActionItem, Produkti } from '../../../../lib/api'
import { getActionBatch } from '../../../../lib/api'
import { rowsFromDetail, type HistoryEditRow } from '../../../../lib/historyBatchEdit'
import {
  dynamicMetaFromDetail,
  saveDynamicHistoryBatchEdits,
  type DynamicHistoryBatchMetaDraft,
} from '../../../../lib/dynamicHistoryBatchEdit'
import { fmtEuro, productLabel } from '../../../../lib/format'
import { formatActionDateTime } from '../../../../lib/actionMeta'
import { scheduleInvalidate, type InvalidateScope } from '../../../../lib/invalidateAppData'
import { queryKeys } from '../../../../lib/queryKeys'
import { useAuth } from '../../../../lib/auth/AuthProvider'
import { useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { useTenantConfig } from '../../../../hooks/useTenantConfig'
import { ProductPickerSheet, type ProductPickerSaveData } from '../../../../mobile/components/ProductPickerSheet'
import { MobileHistoriDetailPending } from '../../../../mobile/components/MobileHistoriDetailPending'
import type { MobileHeaderState } from '../../../../mobile/types'
import { DynamicHistoriActionMetaSheet } from '../components/DynamicHistoriActionMetaSheet'

function MobileLlojiBadge(props: { lloji: ActionBatchDetail['lloji'] }) {
  const cls =
    props.lloji === 'Hyrje'
      ? 'mobile-badge-hyrje'
      : props.lloji === 'Dalje'
        ? 'mobile-badge-dalje'
        : 'mobile-badge-transfer'
  return <span className={`mobile-badge ${cls}`}>{props.lloji}</span>
}

function DynamicHistoriDetailProductRow(props: {
  item: HistoryActionItem
  trackPrice: boolean
  canRemove: boolean
  busy: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const shenim = (props.item.shenim ?? '').trim()

  return (
    <div className="mobile-row-card mobile-row-card-readonly dynamic-histori-detail-item">
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
        <div className="mobile-row-card-title">
          {productLabel(props.item.emri_produktit, props.item.kodi_produktit)}
        </div>
        <div className="mobile-row-card-sub">
          {props.trackPrice ? (
            <>
              {fmtEuro(props.item.cmimi_njesi)} × {props.item.sasia} cop
            </>
          ) : (
            <>{props.item.sasia} cop</>
          )}
        </div>
        {props.trackPrice ? (
          <div className="mobile-row-card-total">Total: {fmtEuro(props.item.totali)}</div>
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
  onNotify: (message: string, variant?: 'success' | 'default' | 'error') => void
  onDeleteRequest: (batch: Pick<ActionBatchDetail, 'id' | 'lloji' | 'data'>) => void
  onHeaderChange: (header: MobileHeaderState) => void
  onBackToList: () => void
  onBatchIdChange: (batchId: string) => void
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

  const [actionMetaSheetOpen, setActionMetaSheetOpen] = React.useState(false)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null)

  const detail = detailQuery.data

  const { onHeaderChange, onBackToList } = props

  React.useEffect(() => {
    onHeaderChange({ kind: 'sub', title: 'Detajet', onBack: onBackToList })
    return () => onHeaderChange({ kind: 'tab' })
  }, [onBackToList, onHeaderChange])

  const metaSaveMut = useMutation({
    mutationFn: async (meta: DynamicHistoryBatchMetaDraft) => {
      if (!detail) throw new Error('Missing batch')
      return saveDynamicHistoryBatchEdits({
        detail,
        meta,
        rows: rowsFromDetail(detail.items),
      })
    },
    onSuccess: (result) => {
      const nextBatchId = result.batch_id ?? props.batchId
      if (result.batch_id) props.onBatchIdChange(result.batch_id)
      setActionMetaSheetOpen(false)
      props.onNotify('Ndryshimet u ruajtuan me sukses.', 'success')
      const scope: InvalidateScope = result.itemsChanged ? 'all' : 'history'
      scheduleInvalidate(qc, scope, { actionBatchId: nextBatchId, userId: user?.id })
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : 'Gabim gjate ruajtjes.'
      props.onNotify(message, 'error')
    },
  })

  const productSaveMut = useMutation({
    mutationFn: async (nextRows: HistoryEditRow[]) => {
      if (!detail) throw new Error('Missing batch')
      return saveDynamicHistoryBatchEdits({
        detail,
        meta: dynamicMetaFromDetail(detail),
        rows: nextRows,
      })
    },
    onSuccess: (result) => {
      const nextBatchId = result.batch_id ?? props.batchId
      if (result.batch_id) props.onBatchIdChange(result.batch_id)
      setPickerOpen(false)
      setEditingItemId(null)
      props.onNotify('Ndryshimet u ruajtuan me sukses.', 'success')
      const scope: InvalidateScope = result.itemsChanged ? 'all' : 'history'
      scheduleInvalidate(qc, scope, { actionBatchId: nextBatchId, userId: user?.id })
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : 'Gabim gjate ruajtjes.'
      props.onNotify(message, 'error')
    },
  })

  const openProductEdit = React.useCallback((itemId: string) => {
    setEditingItemId(itemId)
    setPickerOpen(true)
  }, [])

  const closeProductPicker = React.useCallback(() => {
    setPickerOpen(false)
    setEditingItemId(null)
  }, [])

  const handleProductPickerSave = React.useCallback(
    (data: ProductPickerSaveData) => {
      if (!detail || !editingItemId) return
      const nextRows = rowsFromDetail(detail.items).map((row) =>
        row.key === editingItemId ? { ...row, draft: { ...row.draft, ...data } } : row,
      )
      productSaveMut.mutate(nextRows)
    },
    [detail, editingItemId, productSaveMut],
  )

  const handleProductRemove = React.useCallback(
    (itemId: string) => {
      if (!detail || detail.items.length <= 1) return
      const nextRows = rowsFromDetail(detail.items).filter((row) => row.key !== itemId)
      productSaveMut.mutate(nextRows)
    },
    [detail, productSaveMut],
  )

  if (detailQuery.isLoading) {
    return <MobileHistoriDetailPending />
  }

  if (!detail) {
    return (
      <div className="mobile-tab-panel">
        <div className="mobile-inline-error">Nuk u gjet veprimi.</div>
      </div>
    )
  }

  const busy = metaSaveMut.isPending || productSaveMut.isPending
  const locLabel = detail.lokacioni_emri ?? sortedLocations.find((l) => l.id === detail.lokacioni_id)?.emri
  const destLabel =
    detail.destination_lokacioni_emri ??
    sortedLocations.find((l) => l.id === detail.destination_lokacioni_id)?.emri
  const pershkrimi = detail.pershkrimi?.trim()
  const dateTime = formatActionDateTime(detail.data, detail.ora)
  const batchSummary = trackPrice ? `Total: ${fmtEuro(detail.totali)}` : null
  const editingItem = editingItemId ? detail.items.find((item) => item.id === editingItemId) : null
  const canRemoveProducts = detail.items.length > 1

  return (
    <div className="mobile-tab-panel dynamic-histori-detail-panel mobile-panel-enter">
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

        <div className="mobile-row-card mobile-histori-row-card mobile-histori-row-card--static">
        <div className="mobile-histori-row-card__header">
          <MobileLlojiBadge lloji={detail.lloji} />
          <span className="mobile-histori-row-card__datetime">{dateTime}</span>
        </div>

        {detail.lloji === 'Transfer' && destLabel ? (
          <div className="mobile-histori-row-card__route">
            <span className="mobile-histori-row-card__location">
              <span className="mobile-histori-row-card__emoji" aria-hidden>
                {detail.flag_emoji ?? '📍'}
              </span>
              <span className="mobile-histori-row-card__location-name">{locLabel ?? '—'}</span>
            </span>
            <span className="mobile-histori-row-card__route-arrow" aria-hidden>
              →
            </span>
            <span className="mobile-histori-row-card__location">
              <span className="mobile-histori-row-card__emoji" aria-hidden>
                {detail.destination_flag_emoji ?? '📍'}
              </span>
              <span className="mobile-histori-row-card__location-name">{destLabel}</span>
            </span>
          </div>
        ) : (
          <div className="mobile-histori-row-card__route">
            <span className="mobile-histori-row-card__location">
              <span className="mobile-histori-row-card__emoji" aria-hidden>
                {detail.flag_emoji ?? '📍'}
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

        <div className="mobile-list-stack">
        {detail.items.map((item) => (
          <DynamicHistoriDetailProductRow
            key={item.id}
            item={item}
            trackPrice={trackPrice}
            canRemove={canRemoveProducts}
            busy={busy}
            onEdit={() => openProductEdit(item.id)}
            onRemove={() => handleProductRemove(item.id)}
          />
        ))}
        </div>
      </div>

      <DynamicHistoriActionMetaSheet
        open={actionMetaSheetOpen}
        detail={detail}
        locations={sortedLocations}
        busy={metaSaveMut.isPending}
        onClose={() => setActionMetaSheetOpen(false)}
        onSave={(meta) => metaSaveMut.mutate(meta)}
        onNotify={props.onNotify}
      />

      <ProductPickerSheet
        open={pickerOpen}
        title="Ndrysho produktin"
        products={pickerProducts}
        showPrice={trackPrice}
        initial={
          editingItem
            ? {
                kodi_produktit: editingItem.kodi_produktit,
                cmimi_njesi: String(editingItem.cmimi_njesi),
                sasia: String(editingItem.sasia),
                shenim: editingItem.shenim ?? '',
              }
            : undefined
        }
        onClose={closeProductPicker}
        onSave={handleProductPickerSave}
      />
    </div>
  )
}
