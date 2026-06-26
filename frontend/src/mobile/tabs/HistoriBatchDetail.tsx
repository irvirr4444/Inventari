import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Country } from '../../lib/country'
import { COUNTRY_META } from '../../lib/country'
import {
  getActionBatch,
  type ActionBatchDetail,
  type Produkti,
} from '../../lib/api'
import { countryLabel, fmtEuro, productLabel, sortProductsByKodi } from '../../lib/format'
import { formatActionDateTime, formatDisplayTime } from '../../lib/actionMeta'
import {
  batchTotal,
  createEmptyEditRow,
  isHistoryEditDirty,
  lineTotal,
  rowsFromDetail,
  saveHistoryBatchEdits,
  type HistoryBatchMetaDraft,
  type HistoryEditRow,
  type HistoryEditSnapshot,
} from '../../lib/historyBatchEdit'
import { scheduleInvalidate, type InvalidateScope } from '../../lib/invalidateAppData'
import { DeleteIcon } from '../../components/icons'
import { NumericInput } from '../../components/NumericInput'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthProvider'
import { BottomSheet } from '../components/BottomSheet'
import { ProductPickerSheet } from '../components/ProductPickerSheet'
import {
  SheetActionFooter,
  SheetConfirmButton,
  SheetEditButton,
  SheetFooterRow,
} from '../components/SheetActions'
import { MobileDateInput } from '../components/MobileDateInput'
import { MobileCountryField } from '../components/MobileCountryField'
import { MobileHistoriDetailPending } from '../components/MobileHistoriDetailPending'
import { OraInput } from '../../components/OraInput'
import type { MobileHeaderState } from '../types'
import { ActionItemShenim } from '../../features/actions/ActionItemShenim'

function MobileLlojiBadge(props: { lloji: ActionBatchDetail['lloji'] }) {
  const cls =
    props.lloji === 'Hyrje'
      ? 'mobile-badge-hyrje'
      : props.lloji === 'Dalje'
        ? 'mobile-badge-dalje'
        : 'mobile-badge-transfer'
  return <span className={`mobile-badge ${cls}`}>{props.lloji}</span>
}

function buildEditSnapshot(batch: ActionBatchDetail): HistoryEditSnapshot {
  return {
    meta: {
      data: batch.data,
      ora: formatDisplayTime(batch.ora),
      pershkrimi: batch.pershkrimi ?? '',
      shteti: batch.shteti,
      destination: batch.destination_shteti ?? '',
    },
    rows: rowsFromDetail(batch.items),
  }
}

function HistoriEditProductRow(props: {
  draft: HistoryEditRow['draft']
  products: Produkti[]
  disabled: boolean
  canRemove: boolean
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
        <span className="mobile-meta-truncate" style={{ textAlign: 'left' }}>
          {label}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
      <div className="mobile-field-row">
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
        <span className="mobile-row-card-total">Totali: {fmtEuro(lineTotal(props.draft))}</span>
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

function HistoriBatchEditView(props: {
  detail: ActionBatchDetail
  products: Produkti[]
  meta: HistoryBatchMetaDraft
  rows: HistoryEditRow[]
  busy: boolean
  error: string | null
  onMetaChange: (meta: HistoryBatchMetaDraft) => void
  onRowsChange: (rows: HistoryEditRow[]) => void
  onSave: () => void
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const productsByKodi = sortProductsByKodi(props.products)

  const updateFrom = (next: Country) => {
    const updated = { ...props.meta, shteti: next }
    if (props.detail.lloji === 'Transfer' && next === props.meta.destination) {
      updated.destination = next === 'XK' ? 'AL' : 'XK'
    }
    props.onMetaChange(updated)
  }

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
    props.onRowsChange([...props.rows, createEmptyEditRow()])
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
                  <MobileCountryField
                    label="Nga"
                    value={props.meta.shteti}
                    disabled={props.busy}
                    sheetTitle="Nga"
                    onChange={updateFrom}
                  />
                  <MobileCountryField
                    label="Te"
                    value={props.meta.destination || (props.meta.shteti === 'XK' ? 'AL' : 'XK')}
                    disabled={props.busy}
                    exclude={props.meta.shteti}
                    sheetTitle="Te"
                    onChange={(c) => props.onMetaChange({ ...props.meta, destination: c })}
                  />
                </div>
              ) : (
                <MobileCountryField
                  label="Shteti"
                  value={props.meta.shteti}
                  disabled={props.busy || props.detail.mirrored_to_albania}
                  sheetTitle="Shteti"
                  onChange={(shteti) => props.onMetaChange({ ...props.meta, shteti })}
                />
              )}

              <div className="mobile-history-meta-field">
                <label className="mobile-label" htmlFor="batch-edit-ora">
                  Ora
                </label>
                <OraInput
                  id="batch-edit-ora"
                  className="mobile-input"
                  value={props.meta.ora}
                  onChange={(ora) => props.onMetaChange({ ...props.meta, ora })}
                  disabled={props.busy}
                />
              </div>
              <div className="mobile-history-meta-field">
                <label className="mobile-label" htmlFor="batch-edit-pershkrimi">
                  Pershkrimi
                </label>
                <input
                  id="batch-edit-pershkrimi"
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
              <HistoriEditProductRow
                key={row.key}
                draft={row.draft}
                products={productsByKodi}
                disabled={props.busy}
                canRemove={props.rows.length > 1}
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

      <div className="mobile-edit-footer">
        <div className="mobile-total-row mobile-history-edit-total">
          <span>Totali i veprimit:</span>
          <span className="mobile-num">{fmtEuro(total)}</span>
        </div>
        <button
          type="button"
          className="mobile-btn-primary"
          disabled={props.busy}
          onClick={props.onSave}
        >
          {props.busy ? 'Duke ruajtur…' : 'Ruaj Ndryshimet'}
        </button>
      </div>
    </>
  )
}

export function HistoriBatchDetail(props: {
  batchId: string
  products: Produkti[]
  onNotify: (message: string, variant?: 'success' | 'default' | 'error') => void
  onDeleteRequest: (batch: Pick<ActionBatchDetail, 'id' | 'lloji' | 'data'>) => void
  onHeaderChange: (header: MobileHeaderState) => void
  onBackToList: () => void
  onBatchIdChange: (batchId: string) => void
}) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const detailQuery = useQuery({
    queryKey: queryKeys.actionBatch(user?.id, props.batchId),
    queryFn: () => getActionBatch(props.batchId),
  })

  const [isEditing, setIsEditing] = React.useState(false)
  const [cancelSheetOpen, setCancelSheetOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [initialSnapshot, setInitialSnapshot] = React.useState<HistoryEditSnapshot | null>(null)
  const [editMeta, setEditMeta] = React.useState<HistoryBatchMetaDraft | null>(null)
  const [editRows, setEditRows] = React.useState<HistoryEditRow[]>([])

  const detail = detailQuery.data

  const currentSnapshot = React.useMemo((): HistoryEditSnapshot | null => {
    if (!editMeta) return null
    return { meta: editMeta, rows: editRows }
  }, [editMeta, editRows])

  const resetEditState = React.useCallback(
    (batch: ActionBatchDetail) => {
      const snapshot = buildEditSnapshot(batch)
      setInitialSnapshot(snapshot)
      setEditMeta(snapshot.meta)
      setEditRows(snapshot.rows)
      setError(null)
    },
    [],
  )

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
    if (isHistoryEditDirty(initialSnapshot, currentSnapshot)) {
      setCancelSheetOpen(true)
    } else {
      cancelEditing()
    }
  }, [initialSnapshot, currentSnapshot, cancelEditing])

  const { onHeaderChange, onBackToList } = props

  React.useEffect(() => {
    if (isEditing) {
      onHeaderChange({
        kind: 'sub',
        title: 'Ndrysho',
        onBack: requestCancel,
      })
    } else {
      onHeaderChange({
        kind: 'sub',
        title: 'Detajet',
        onBack: onBackToList,
      })
    }
    return () => onHeaderChange({ kind: 'tab' })
  }, [isEditing, requestCancel, onBackToList, onHeaderChange])

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!detail || !editMeta) throw new Error('Missing batch')
      return saveHistoryBatchEdits({
        detail,
        meta: editMeta,
        rows: editRows,
      })
    },
    onSuccess: (result) => {
      const nextBatchId = result.batch_id ?? props.batchId
      if (result.batch_id) {
        props.onBatchIdChange(result.batch_id)
      }
      cancelEditing()
      props.onNotify('Veprimi u përditësua me sukses.', 'success')
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

  if (isEditing && initialSnapshot && editMeta) {
    return (
      <>
        <HistoriBatchEditView
          detail={detail}
          products={props.products}
          meta={editMeta}
          rows={editRows}
          busy={busy}
          error={error}
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
        {detail.lloji === 'Transfer' && detail.destination_shteti ? (
          <div className="mobile-card-meta row" style={{ gap: 6, marginTop: 4, alignItems: 'center' }}>
            <img className="flagIcon" src={COUNTRY_META[detail.shteti].flagSrc} alt="" width={18} height={12} />
            {countryLabel(detail.shteti)} → {countryLabel(detail.destination_shteti)}
            <img
              className="flagIcon"
              src={COUNTRY_META[detail.destination_shteti].flagSrc}
              alt=""
              width={18}
              height={12}
            />
          </div>
        ) : (
          <div className="mobile-card-meta row" style={{ gap: 6, marginTop: 4, alignItems: 'center' }}>
            <img className="flagIcon" src={COUNTRY_META[detail.shteti].flagSrc} alt="" width={18} height={12} />
            {countryLabel(detail.shteti)}
          </div>
        )}
        <div className="mobile-card-label" style={{ marginTop: 8 }}>
          Total: {fmtEuro(detail.totali)}
        </div>
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
                {fmtEuro(item.cmimi_njesi)} × {item.sasia} cop
              </div>
              <div className="mobile-row-card-total">Total: {fmtEuro(item.totali)}</div>
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
