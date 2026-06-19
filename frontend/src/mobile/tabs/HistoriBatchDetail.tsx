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
import { isLegacyBatchId } from '../../lib/actionBatch'
import {
  draftsFromItems,
  saveHistoryBatchEdits,
  type HistoryItemDraft,
} from '../../lib/historyBatchEdit'
import { invalidateAfterMutation } from '../../lib/invalidateAppData'
import { NumericInput } from '../../components/NumericInput'
import { queryKeys } from '../../lib/queryKeys'
import { ProductPickerSheet } from '../components/ProductPickerSheet'
import {
  SheetConfirmButton,
  SheetEditButton,
  SheetFooterRow,
} from '../components/SheetActions'
import { MobileDateInput } from '../components/MobileDateInput'
import { MobileCountryField } from '../components/MobileCountryField'
import { SkeletonRow } from '../components/SkeletonRow'
import { OraInput } from '../../components/OraInput'

function MobileLlojiBadge(props: { lloji: ActionBatchDetail['lloji'] }) {
  const cls =
    props.lloji === 'Hyrje'
      ? 'mobile-badge-hyrje'
      : props.lloji === 'Dalje'
        ? 'mobile-badge-dalje'
        : 'mobile-badge-transfer'
  return <span className={`mobile-badge ${cls}`}>{props.lloji}</span>
}

function HistoriEditProductRow(props: {
  draft: HistoryItemDraft
  products: Produkti[]
  otherKodis: string[]
  disabled: boolean
  onDraftChange: (patch: Partial<HistoryItemDraft>) => void
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const product = props.products.find((p) => p.kodi === props.draft.kodi_produktit)
  const label = product
    ? productLabel(product.emri, product.kodi)
    : props.draft.kodi_produktit || 'Zgjedh produktin…'

  return (
    <div className="mobile-history-edit-card">
      <div>
        <label className="mobile-label">Produkti</label>
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
      </div>
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

      <ProductPickerSheet
        open={pickerOpen}
        title="Zgjedh produktin"
        products={props.products}
        existingKodis={props.otherKodis}
        initial={{
          kodi_produktit: props.draft.kodi_produktit,
          cmimi_njesi: props.draft.cmimi_njesi,
          sasia: props.draft.sasia,
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

export function HistoriBatchDetail(props: {
  batchId: string
  products: Produkti[]
  onNotify: (message: string, variant?: 'success' | 'default' | 'error') => void
  onDeleteRequest: (batch: Pick<ActionBatchDetail, 'id' | 'lloji' | 'data'>) => void
}) {
  const qc = useQueryClient()
  const detailQuery = useQuery({
    queryKey: queryKeys.actionBatch(props.batchId),
    queryFn: () => getActionBatch(props.batchId),
  })

  const [isEditing, setIsEditing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState('')
  const [ora, setOra] = React.useState('')
  const [pershkrimi, setPershkrimi] = React.useState('')
  const [shteti, setShteti] = React.useState<Country>('XK')
  const [destination, setDestination] = React.useState<Country | ''>('')
  const [editRows, setEditRows] = React.useState<Record<string, HistoryItemDraft>>({})

  const detail = detailQuery.data
  const isLegacy = detail ? isLegacyBatchId(detail.id) : false

  const resetEditState = React.useCallback((batch: ActionBatchDetail) => {
    setData(batch.data)
    setOra(formatDisplayTime(batch.ora))
    setPershkrimi(batch.pershkrimi ?? '')
    setShteti(batch.shteti)
    setDestination(batch.destination_shteti ?? '')
    setEditRows(draftsFromItems(batch.items))
    setError(null)
  }, [])

  const startEditing = React.useCallback(() => {
    if (!detail) return
    resetEditState(detail)
    setIsEditing(true)
  }, [detail, resetEditState])

  const cancelEditing = React.useCallback(() => {
    setIsEditing(false)
    setError(null)
  }, [])

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!detail) throw new Error('Missing batch')
      await saveHistoryBatchEdits({
        detail,
        meta: { data, ora, pershkrimi, shteti, destination },
        itemDrafts: editRows,
        isLegacy,
      })
    },
    onSuccess: async () => {
      setIsEditing(false)
      setError(null)
      await invalidateAfterMutation(qc, 'all', { actionBatchId: props.batchId })
      await detailQuery.refetch()
      props.onNotify('Veprimi u përditësua me sukses.', 'success')
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : 'Gabim gjate ruajtjes.'
      setError(message)
      props.onNotify(message, 'error')
    },
  })

  const updateFrom = (next: Country) => {
    setShteti(next)
    if (detail?.lloji === 'Transfer' && next === destination) {
      setDestination(next === 'XK' ? 'AL' : 'XK')
    }
  }

  const updateEditRow = (itemId: string, patch: Partial<HistoryItemDraft>) => {
    setEditRows((prev) => {
      const current = prev[itemId]
      if (!current) return prev
      return { ...prev, [itemId]: { ...current, ...patch } }
    })
  }

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
  const productsByKodi = sortProductsByKodi(props.products)

  return (
    <>
      <div className={`mobile-tab-panel${isEditing ? ' is-editing' : ''}`}>
        <div className="mobile-row-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <MobileLlojiBadge lloji={detail.lloji} />

          {isEditing ? (
            <div className="mobile-list-stack" style={{ width: '100%', marginTop: 12 }}>
              <div>
                <label className="mobile-label">Data</label>
                <MobileDateInput
                  value={data}
                  onChange={setData}
                  disabled={busy}
                  aria-label="Data"
                  placeholder="Data"
                />
              </div>

              {!isLegacy ? (
                <>
                  <div>
                    <label className="mobile-label" htmlFor="batch-edit-ora">
                      Ora
                    </label>
                    <OraInput
                      id="batch-edit-ora"
                      className="mobile-input"
                      value={ora}
                      onChange={setOra}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="mobile-label" htmlFor="batch-edit-pershkrimi">
                      Pershkrimi
                    </label>
                    <input
                      id="batch-edit-pershkrimi"
                      type="text"
                      className="mobile-input"
                      value={pershkrimi}
                      onChange={(e) => setPershkrimi(e.target.value)}
                      disabled={busy}
                      maxLength={500}
                      placeholder="Opsionale"
                    />
                  </div>
                </>
              ) : null}

              {detail.lloji === 'Transfer' ? (
                <>
                  <MobileCountryField
                    label="Nga"
                    value={shteti}
                    disabled={busy}
                    sheetTitle="Nga"
                    onChange={updateFrom}
                  />
                  <MobileCountryField
                    label="Ne"
                    value={destination || (shteti === 'XK' ? 'AL' : 'XK')}
                    disabled={busy}
                    exclude={shteti}
                    sheetTitle="Ne"
                    onChange={(c) => setDestination(c)}
                  />
                </>
              ) : (
                <MobileCountryField
                  label="Shteti"
                  value={shteti}
                  disabled={busy || detail.mirrored_to_albania}
                  sheetTitle="Shteti"
                  onChange={setShteti}
                />
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="mobile-section-label">Produktet</div>

        {isEditing ? (
          <div className="mobile-list-stack">
            {detail.items.map((item) => (
              <HistoriEditProductRow
                key={item.id}
                draft={editRows[item.id] ?? draftsFromItems([item])[item.id]}
                products={productsByKodi}
                otherKodis={detail.items
                  .filter((x) => x.id !== item.id)
                  .map((x) => editRows[x.id]?.kodi_produktit ?? x.kodi_produktit)
                  .filter(Boolean)}
                disabled={busy}
                onDraftChange={(patch) => updateEditRow(item.id, patch)}
              />
            ))}
          </div>
        ) : (
          <div className="mobile-list-stack">
            {detail.items.map((item) => (
              <div key={item.id} className="mobile-row-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="mobile-row-card-title">
                  {productLabel(item.emri_produktit, item.kodi_produktit)}
                </div>
                <div className="mobile-row-card-sub">
                  {fmtEuro(item.cmimi_njesi)} × {item.sasia} cop
                </div>
                <div className="mobile-row-card-total">Total: {fmtEuro(item.totali)}</div>
              </div>
            ))}
          </div>
        )}

        {error ? <div className="mobile-inline-error">{error}</div> : null}

        {!isEditing ? (
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
        ) : null}
      </div>

      {isEditing ? (
        <div className="mobile-edit-footer">
          <button type="button" className="mobile-btn-outline" disabled={busy} onClick={cancelEditing}>
            Anulo
          </button>
          <button
            type="button"
            className="mobile-btn-primary"
            disabled={busy}
            onClick={() => saveMut.mutate()}
          >
            {busy ? 'Duke ruajtur…' : 'Ruaj'}
          </button>
        </div>
      ) : null}
    </>
  )
}
