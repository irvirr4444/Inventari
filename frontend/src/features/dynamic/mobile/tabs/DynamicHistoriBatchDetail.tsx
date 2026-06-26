import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DeleteIcon } from '../../../../components/icons'
import { NumericInput } from '../../../../components/NumericInput'
import { OraInput } from '../../../../components/OraInput'
import type { ActionBatchDetail, DynamicProdukti, Produkti } from '../../../../lib/api'
import { getActionBatch } from '../../../../lib/api'
import {
  batchTotal,
  lineTotal,
  rowsFromDetail,
  type HistoryEditRow,
} from '../../../../lib/historyBatchEdit'
import {
  dynamicMetaFromDetail,
  isDynamicHistoryEditDirty,
  saveDynamicHistoryBatchEdits,
  type DynamicHistoryBatchMetaDraft,
  createEmptyDynamicEditRow,
} from '../../../../lib/dynamicHistoryBatchEdit'
import { fmtEuro, productLabel, sortProductsByKodi } from '../../../../lib/format'
import { formatActionDateTime } from '../../../../lib/actionMeta'
import { scheduleInvalidate, type InvalidateScope } from '../../../../lib/invalidateAppData'
import { queryKeys } from '../../../../lib/queryKeys'
import { useAuth } from '../../../../lib/auth/AuthProvider'
import { useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { useTenantConfig } from '../../../../hooks/useTenantConfig'
import { BottomSheet } from '../../../../mobile/components/BottomSheet'
import { ProductPickerSheet } from '../../../../mobile/components/ProductPickerSheet'
import {
  SheetActionFooter,
  SheetConfirmButton,
  SheetEditButton,
  SheetFooterRow,
} from '../../../../mobile/components/SheetActions'
import { MobileDateInput } from '../../../../mobile/components/MobileDateInput'
import { SkeletonRow } from '../../../../mobile/components/SkeletonRow'
import type { MobileHeaderState } from '../../../../mobile/types'
import { ActionItemShenim } from '../../../../features/actions/ActionItemShenim'
import {
  DynamicLocationField,
  DynamicLocationPickerSheet,
} from '../components/DynamicLocationPickerSheet'

type DynamicEditSnapshot = {
  meta: DynamicHistoryBatchMetaDraft
  rows: HistoryEditRow[]
}

function MobileLlojiBadge(props: { lloji: ActionBatchDetail['lloji'] }) {
  const cls =
    props.lloji === 'Hyrje'
      ? 'mobile-badge-hyrje'
      : props.lloji === 'Dalje'
        ? 'mobile-badge-dalje'
        : 'mobile-badge-transfer'
  return <span className={`mobile-badge ${cls}`}>{props.lloji}</span>
}

function buildEditSnapshot(batch: ActionBatchDetail): DynamicEditSnapshot {
  return {
    meta: dynamicMetaFromDetail(batch),
    rows: rowsFromDetail(batch.items),
  }
}

function DynamicHistoriEditProductRow(props: {
  draft: HistoryEditRow['draft']
  products: Produkti[]
  disabled: boolean
  canRemove: boolean
  showPrice: boolean
  onDraftChange: (patch: Partial<HistoryEditRow['draft']>) => void
  onRemove: () => void
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const product = props.products.find((p) => p.kodi === props.draft.kodi_produktit)
  const label = product
    ? productLabel(product.emri, product.kodi)
    : props.draft.kodi_produktit || 'Zgjedh produktin…'

  return (
    <div className="mobile-history-edit-card">
      <button
        type="button"
        className="mobile-tap-field"
        disabled={props.disabled}
        onClick={() => setPickerOpen(true)}
      >
        <span className="mobile-meta-truncate" style={{ textAlign: 'left' }}>{label}</span>
        <span aria-hidden="true">▾</span>
      </button>
      <div className={`mobile-field-row${props.showPrice ? '' : ' mobile-field-row-single'}`}>
        {props.showPrice ? (
          <div>
            <label className="mobile-label">Cmimi/Njesi</label>
            <NumericInput
              className="mobile-input"
              step="0.01"
              min={0}
              value={props.draft.cmimi_njesi}
              disabled={props.disabled}
              onChange={(v) => props.onDraftChange({ cmimi_njesi: v })}
              placeholder="0.00"
            />
          </div>
        ) : null}
        <div>
          <label className="mobile-label">Sasia</label>
          <NumericInput
            className="mobile-input"
            min={1}
            value={props.draft.sasia}
            disabled={props.disabled}
            onChange={(v) => props.onDraftChange({ sasia: v })}
            placeholder="1"
          />
        </div>
      </div>
      <div className="mobile-history-edit-card-footer">
        {props.showPrice ? (
          <span className="mobile-row-card-total">Totali: {fmtEuro(lineTotal(props.draft))}</span>
        ) : (
          <span />
        )}
        <div className="mobile-row-card-actions">
          <ActionItemShenim
            value={props.draft.shenim}
            onChange={(value) => props.onDraftChange({ shenim: value })}
            onNotify={props.onNotify}
            disabled={props.disabled}
            icon="edit"
            className="mobile-row-card-action-btn mobile-row-card-action-btn--edit"
          />
          {props.canRemove ? (
            <button
              type="button"
              className="mobile-row-card-action-btn mobile-row-card-action-btn--delete"
              aria-label="Fshi produktin"
              disabled={props.disabled}
              onClick={props.onRemove}
            >
              <DeleteIcon />
            </button>
          ) : null}
        </div>
      </div>

      <ProductPickerSheet
        open={pickerOpen}
        title="Zgjedh produktin"
        products={props.products}
        showPrice={props.showPrice}
        initial={{
          kodi_produktit: props.draft.kodi_produktit,
          cmimi_njesi: props.draft.cmimi_njesi,
          sasia: props.draft.sasia,
          shenim: props.draft.shenim,
        }}
        onClose={() => setPickerOpen(false)}
        onSave={(data) => {
          props.onDraftChange(data)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}

function DynamicHistoriBatchEditView(props: {
  detail: ActionBatchDetail
  products: Produkti[]
  locations: Array<{ id: string; emri: string; flag_emoji?: string | null }>
  meta: DynamicHistoryBatchMetaDraft
  rows: HistoryEditRow[]
  busy: boolean
  error: string | null
  showPrice: boolean
  onMetaChange: (meta: DynamicHistoryBatchMetaDraft) => void
  onRowsChange: (rows: HistoryEditRow[]) => void
  onSave: () => void
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const [fromOpen, setFromOpen] = React.useState(false)
  const [toOpen, setToOpen] = React.useState(false)
  const [locOpen, setLocOpen] = React.useState(false)
  const productsByKodi = sortProductsByKodi(props.products)

  const updateRow = (key: string, patch: Partial<HistoryEditRow['draft']>) => {
    props.onRowsChange(
      props.rows.map((row) =>
        row.key === key ? { ...row, draft: { ...row.draft, ...patch } } : row,
      ),
    )
  }

  const removeRow = (key: string) => {
    if (props.rows.length <= 1) return
    props.onRowsChange(props.rows.filter((row) => row.key !== key))
  }

  const addRow = () => {
    props.onRowsChange([...props.rows, createEmptyDynamicEditRow()])
  }

  const setFrom = (id: string) => {
    const next = { ...props.meta, lokacioni_id: id }
    if (id === props.meta.destination_lokacioni_id) {
      const alt = props.locations.find((l) => l.id !== id)
      if (alt) next.destination_lokacioni_id = alt.id
    }
    props.onMetaChange(next)
  }

  const total = batchTotal(props.rows)

  return (
    <>
      <div className="mobile-tab-panel is-editing">
        <div className="mobile-history-edit-section">
          <div className="mobile-section-label">DETAJET</div>
          <div className="mobile-history-edit-meta-card">
            <div className="mobile-list-stack">
              <div className="mobile-history-meta-field">
                <label className="mobile-label">Data</label>
                <MobileDateInput
                  value={props.meta.data}
                  onChange={(data) => props.onMetaChange({ ...props.meta, data })}
                  disabled={props.busy}
                  aria-label="Data"
                  placeholder="Data"
                />
              </div>

              {props.detail.lloji === 'Transfer' ? (
                <div className="mobile-field-row mobile-history-route-row">
                  <DynamicLocationField
                    label="Nga"
                    value={props.meta.lokacioni_id}
                    locations={props.locations}
                    onOpen={() => setFromOpen(true)}
                  />
                  <DynamicLocationField
                    label="Te"
                    value={props.meta.destination_lokacioni_id}
                    locations={props.locations}
                    onOpen={() => setToOpen(true)}
                  />
                </div>
              ) : (
                <DynamicLocationField
                  label="Lokacioni"
                  value={props.meta.lokacioni_id}
                  locations={props.locations}
                  onOpen={() => setLocOpen(true)}
                />
              )}

              <div className="mobile-history-meta-field">
                <label className="mobile-label" htmlFor="dynamic-batch-edit-ora">Ora</label>
                <OraInput
                  id="dynamic-batch-edit-ora"
                  className="mobile-input"
                  value={props.meta.ora}
                  onChange={(ora) => props.onMetaChange({ ...props.meta, ora })}
                  disabled={props.busy}
                />
              </div>
              <div className="mobile-history-meta-field">
                <label className="mobile-label" htmlFor="dynamic-batch-edit-pershkrimi">
                  Pershkrimi
                </label>
                <input
                  id="dynamic-batch-edit-pershkrimi"
                  type="text"
                  className="mobile-input"
                  value={props.meta.pershkrimi}
                  onChange={(e) =>
                    props.onMetaChange({ ...props.meta, pershkrimi: e.target.value })
                  }
                  disabled={props.busy}
                  maxLength={500}
                  placeholder="Opsionale"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mobile-history-edit-section">
          <div className="mobile-section-label">PRODUKTET</div>
          <div className="mobile-list-stack">
            {props.rows.map((row) => (
              <DynamicHistoriEditProductRow
                key={row.key}
                draft={row.draft}
                products={productsByKodi}
                disabled={props.busy}
                canRemove={props.rows.length > 1}
                showPrice={props.showPrice}
                onDraftChange={(patch) => updateRow(row.key, patch)}
                onRemove={() => removeRow(row.key)}
                onNotify={props.onNotify}
              />
            ))}
          </div>
          <button
            type="button"
            className="mobile-btn-outline mobile-history-add-product"
            disabled={props.busy}
            onClick={addRow}
          >
            + Shto Produkt
          </button>
        </div>

        {props.error ? <div className="mobile-inline-error">{props.error}</div> : null}
      </div>

      {props.showPrice ? (
        <div className="mobile-edit-footer">
          <div className="mobile-total-row mobile-history-edit-total">
            <span>Totali i veprimit:</span>
            <span className="mobile-num">{fmtEuro(total)}</span>
          </div>
          <button type="button" className="mobile-btn-primary" disabled={props.busy} onClick={props.onSave}>
            {props.busy ? 'Duke ruajtur…' : 'Ruaj Ndryshimet'}
          </button>
        </div>
      ) : (
        <div className="mobile-edit-footer">
          <button type="button" className="mobile-btn-primary" disabled={props.busy} onClick={props.onSave}>
            {props.busy ? 'Duke ruajtur…' : 'Ruaj Ndryshimet'}
          </button>
        </div>
      )}

      <DynamicLocationPickerSheet
        open={fromOpen}
        title="Nga"
        value={props.meta.lokacioni_id}
        excludeIds={[props.meta.destination_lokacioni_id]}
        allowAdd
        onNotify={props.onNotify}
        onClose={() => setFromOpen(false)}
        onSelect={setFrom}
      />
      <DynamicLocationPickerSheet
        open={toOpen}
        title="Te"
        value={props.meta.destination_lokacioni_id}
        excludeIds={[props.meta.lokacioni_id]}
        allowAdd
        onNotify={props.onNotify}
        onClose={() => setToOpen(false)}
        onSelect={(id) => props.onMetaChange({ ...props.meta, destination_lokacioni_id: id })}
      />
      <DynamicLocationPickerSheet
        open={locOpen}
        title="Lokacioni"
        value={props.meta.lokacioni_id}
        allowAdd
        onNotify={props.onNotify}
        onClose={() => setLocOpen(false)}
        onSelect={(id) => props.onMetaChange({ ...props.meta, lokacioni_id: id })}
      />
    </>
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

  const [isEditing, setIsEditing] = React.useState(false)
  const [cancelSheetOpen, setCancelSheetOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [initialSnapshot, setInitialSnapshot] = React.useState<DynamicEditSnapshot | null>(null)
  const [editMeta, setEditMeta] = React.useState<DynamicHistoryBatchMetaDraft | null>(null)
  const [editRows, setEditRows] = React.useState<HistoryEditRow[]>([])

  const detail = detailQuery.data

  const currentSnapshot = React.useMemo((): DynamicEditSnapshot | null => {
    if (!editMeta) return null
    return { meta: editMeta, rows: editRows }
  }, [editMeta, editRows])

  const resetEditState = React.useCallback((batch: ActionBatchDetail) => {
    const snapshot = buildEditSnapshot(batch)
    setInitialSnapshot(snapshot)
    setEditMeta(snapshot.meta)
    setEditRows(snapshot.rows)
    setError(null)
  }, [])

  const startEditing = React.useCallback(() => {
    if (!detail) return
    resetEditState(detail)
    setIsEditing(true)
  }, [detail, resetEditState])

  const cancelEditing = React.useCallback(() => {
    setIsEditing(false)
    setCancelSheetOpen(false)
    setError(null)
    setInitialSnapshot(null)
    setEditMeta(null)
    setEditRows([])
  }, [])

  const requestCancel = React.useCallback(() => {
    if (!initialSnapshot || !currentSnapshot) {
      cancelEditing()
      return
    }
    if (isDynamicHistoryEditDirty(initialSnapshot, currentSnapshot)) {
      setCancelSheetOpen(true)
    } else {
      cancelEditing()
    }
  }, [initialSnapshot, currentSnapshot, cancelEditing])

  const { onHeaderChange, onBackToList } = props

  React.useEffect(() => {
    if (isEditing) {
      onHeaderChange({ kind: 'sub', title: 'Ndrysho', onBack: requestCancel })
    } else {
      onHeaderChange({ kind: 'sub', title: 'Detajet', onBack: onBackToList })
    }
    return () => onHeaderChange({ kind: 'tab' })
  }, [isEditing, requestCancel, onBackToList, onHeaderChange])

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!detail || !editMeta) throw new Error('Missing batch')
      return saveDynamicHistoryBatchEdits({ detail, meta: editMeta, rows: editRows })
    },
    onSuccess: (result) => {
      const nextBatchId = result.batch_id ?? props.batchId
      if (result.batch_id) props.onBatchIdChange(result.batch_id)
      cancelEditing()
      props.onNotify('Ndryshimet u ruajtuan me sukses.', 'success')
      const scope: InvalidateScope = result.itemsChanged ? 'all' : 'history'
      scheduleInvalidate(qc, scope, { actionBatchId: nextBatchId, userId: user?.id })
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : 'Gabim gjate ruajtjes.'
      setError(message)
      props.onNotify(message, 'error')
    },
  })

  if (detailQuery.isLoading) {
    return (
      <div className="mobile-tab-panel">
        <SkeletonRow count={4} />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="mobile-tab-panel">
        <div className="mobile-inline-error">Nuk u gjet veprimi.</div>
      </div>
    )
  }

  const busy = saveMut.isPending
  const locLabel = detail.lokacioni_emri ?? sortedLocations.find((l) => l.id === detail.lokacioni_id)?.emri
  const destLabel =
    detail.destination_lokacioni_emri ??
    sortedLocations.find((l) => l.id === detail.destination_lokacioni_id)?.emri

  if (isEditing && initialSnapshot && editMeta) {
    return (
      <>
        <DynamicHistoriBatchEditView
          detail={detail}
          products={pickerProducts}
          locations={sortedLocations}
          meta={editMeta}
          rows={editRows}
          busy={busy}
          error={error}
          showPrice={trackPrice}
          onMetaChange={setEditMeta}
          onRowsChange={setEditRows}
          onSave={() => saveMut.mutate()}
          onNotify={props.onNotify}
        />

        <BottomSheet
          open={cancelSheetOpen}
          title="Ke ndryshime të paruajtura."
          onClose={() => setCancelSheetOpen(false)}
          footer={
            <SheetActionFooter
              cancelLabel="Vazhdo Editimin"
              confirmLabel="Mbyll pa ruajtur"
              confirmVariant="danger"
              confirmIcon="delete"
              onCancel={() => setCancelSheetOpen(false)}
              onConfirm={cancelEditing}
            />
          }
        >
          <p className="mobile-card-meta">Ndryshimet do të humbasin nëse mbyll pa ruajtur.</p>
        </BottomSheet>
      </>
    )
  }

  return (
    <div className="mobile-tab-panel">
      <div className="mobile-row-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <MobileLlojiBadge lloji={detail.lloji} />
        <div className="mobile-card-meta" style={{ marginTop: 8 }}>
          {formatActionDateTime(detail.data, detail.ora)}
        </div>
        {detail.pershkrimi?.trim() ? (
          <div className="mobile-card-meta mobile-card-meta-secondary" style={{ marginTop: 4 }}>
            {detail.pershkrimi.trim()}
          </div>
        ) : null}
        {detail.lloji === 'Transfer' && destLabel ? (
          <div className="mobile-card-meta row" style={{ gap: 6, marginTop: 4, alignItems: 'center' }}>
            <span>{detail.flag_emoji ?? '📍'}</span>
            {locLabel} → {destLabel}
            <span>{detail.destination_flag_emoji ?? '📍'}</span>
          </div>
        ) : (
          <div className="mobile-card-meta row" style={{ gap: 6, marginTop: 4, alignItems: 'center' }}>
            <span>{detail.flag_emoji ?? '📍'}</span>
            {locLabel ?? '—'}
          </div>
        )}
        {trackPrice ? (
          <div className="mobile-card-label" style={{ marginTop: 8 }}>
            Total: {fmtEuro(detail.totali)}
          </div>
        ) : null}
      </div>

      <div className="mobile-section-label">Produktet</div>

      <div className="mobile-list-stack">
        {detail.items.map((item) => (
          <div key={item.id} className="mobile-row-card mobile-row-card-readonly">
            <div className="mobile-row-card-body">
              <div className="mobile-row-card-title">
                {productLabel(item.emri_produktit, item.kodi_produktit)}
              </div>
              <div className="mobile-row-card-sub">
                {trackPrice ? (
                  <>
                    {fmtEuro(item.cmimi_njesi)} × {item.sasia} cop
                  </>
                ) : (
                  <>{item.sasia} cop</>
                )}
              </div>
              {trackPrice ? (
                <div className="mobile-row-card-total">Total: {fmtEuro(item.totali)}</div>
              ) : null}
            </div>
            <ActionItemShenim value={item.shenim ?? ''} readOnly className="mobile-icon-btn" />
          </div>
        ))}
      </div>

      <SheetFooterRow>
        <SheetEditButton label="Ndrysho" onClick={startEditing} />
        <SheetConfirmButton
          label="Fshi"
          variant="danger"
          icon="delete"
          onClick={() =>
            props.onDeleteRequest({ id: detail.id, lloji: detail.lloji, data: detail.data })
          }
        />
      </SheetFooterRow>
    </div>
  )
}
