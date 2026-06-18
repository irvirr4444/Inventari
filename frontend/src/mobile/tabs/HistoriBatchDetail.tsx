import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Country } from '../../lib/country'
import { COUNTRY_META } from '../../lib/country'
import {
  getActionBatch,
  updateActionBatch,
  updateActionBatchItem,
  type ActionBatchDetail,
  type HistoryActionItem,
  type Produkti,
} from '../../lib/api'
import { countryLabel, fmtEuro, formatDisplayDate, productLabel, sortProductsByKodi } from '../../lib/format'
import { invalidateAfterMutation } from '../../lib/invalidateAppData'
import { queryKeys } from '../../lib/queryKeys'
import { BottomSheet } from '../components/BottomSheet'
import {
  SheetCancelButton,
  SheetConfirmButton,
  SheetEditButton,
  SheetFooterRow,
} from '../components/SheetActions'
import { MobileDateInput } from '../components/MobileDateInput'
import { MobileCountryField } from '../components/MobileCountryField'
import { SkeletonRow } from '../components/SkeletonRow'

function MobileLlojiBadge(props: { lloji: ActionBatchDetail['lloji'] }) {
  const cls =
    props.lloji === 'Hyrje'
      ? 'mobile-badge-hyrje'
      : props.lloji === 'Dalje'
        ? 'mobile-badge-dalje'
        : 'mobile-badge-transfer'
  return <span className={`mobile-badge ${cls}`}>{props.lloji}</span>
}

export function HistoriBatchDetail(props: {
  batchId: string
  products: Produkti[]
  onNotify: (message: string, variant?: 'success' | 'default') => void
  onDeleteRequest: (batch: Pick<ActionBatchDetail, 'id' | 'lloji' | 'data'>) => void
}) {
  const qc = useQueryClient()
  const detailQuery = useQuery({
    queryKey: queryKeys.actionBatch(props.batchId),
    queryFn: () => getActionBatch(props.batchId),
  })

  const [editOpen, setEditOpen] = React.useState(false)
  const [editItemId, setEditItemId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const detail = detailQuery.data

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

  return (
    <>
      <div className="mobile-tab-panel">
        <div className="mobile-row-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <MobileLlojiBadge lloji={detail.lloji} />
          <div className="mobile-card-meta" style={{ marginTop: 8 }}>
            {formatDisplayDate(detail.data)}
          </div>
          {detail.lloji === 'Transfer' && detail.destination_shteti ? (
            <div className="mobile-card-meta row" style={{ gap: 6, marginTop: 4, alignItems: 'center' }}>
              <img className="flagIcon" src={COUNTRY_META[detail.shteti].flagSrc} alt="" width={18} height={12} />
              {countryLabel(detail.shteti)} → {countryLabel(detail.destination_shteti)}
              <img className="flagIcon" src={COUNTRY_META[detail.destination_shteti].flagSrc} alt="" width={18} height={12} />
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

        {error ? <div className="mobile-inline-error">{error}</div> : null}

        <SheetFooterRow>
          <SheetEditButton label="Ndrysho" onClick={() => setEditOpen(true)} />
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

      <MobileBatchEditSheet
        open={editOpen}
        detail={detail}
        products={props.products}
        editItemId={editItemId}
        onEditItem={setEditItemId}
        onClose={() => {
          setEditOpen(false)
          setEditItemId(null)
          setError(null)
        }}
        onError={setError}
        onSaved={(msg) => {
          props.onNotify(msg, 'success')
          void detailQuery.refetch()
        }}
        onInvalidate={() => invalidateAfterMutation(qc, 'all', { actionBatchId: props.batchId })}
      />
    </>
  )
}

function MobileBatchEditSheet(props: {
  open: boolean
  detail: ActionBatchDetail
  products: Produkti[]
  editItemId: string | null
  onEditItem: (id: string | null) => void
  onClose: () => void
  onError: (msg: string) => void
  onSaved: (msg: string) => void
  onInvalidate: () => Promise<void>
}) {
  return (
    <BottomSheet open={props.open} title="Ndrysho veprimin" onClose={props.onClose}>
      {props.open ? (
        <MobileBatchEditForm
          key={props.detail.id}
          detail={props.detail}
          products={props.products}
          editItemId={props.editItemId}
          onEditItem={props.onEditItem}
          onError={props.onError}
          onSaved={props.onSaved}
          onInvalidate={props.onInvalidate}
        />
      ) : null}
    </BottomSheet>
  )
}

function MobileBatchEditForm(props: {
  detail: ActionBatchDetail
  products: Produkti[]
  editItemId: string | null
  onEditItem: (id: string | null) => void
  onError: (msg: string) => void
  onSaved: (msg: string) => void
  onInvalidate: () => Promise<void>
}) {
  const [data, setData] = React.useState(props.detail.data)
  const [shteti, setShteti] = React.useState<Country>(props.detail.shteti)
  const [destination, setDestination] = React.useState<Country | ''>(
    props.detail.destination_shteti ?? '',
  )
  const [editDraft, setEditDraft] = React.useState<{
    kodi_produktit: string
    cmimi_njesi: string
    sasia: string
  } | null>(null)

  const productsByKodi = React.useMemo(
    () => sortProductsByKodi(props.products),
    [props.products],
  )

  const updateBatchMut = useMutation({
    mutationFn: () => {
      const payload: { data?: string; shteti?: Country; destination_shteti?: Country } = { data }
      if (props.detail.lloji === 'Transfer') {
        payload.shteti = shteti
        if (destination) payload.destination_shteti = destination as Country
      } else if (!props.detail.mirrored_to_albania) {
        payload.shteti = shteti
      }
      return updateActionBatch(props.detail.id, payload)
    },
    onSuccess: async () => {
      await props.onInvalidate()
      props.onSaved('Veprimi u perditesua me sukses.')
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
      props.onEditItem(null)
      setEditDraft(null)
      await props.onInvalidate()
      props.onSaved('Produkti u perditesua me sukses.')
    },
    onError: (e) => props.onError(e instanceof Error ? e.message : 'Error'),
  })

  const startEditItem = (item: HistoryActionItem) => {
    props.onEditItem(item.id)
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
    const duplicate = props.detail.items.find(
      (it) => it.id !== itemId && it.kodi_produktit === editDraft.kodi_produktit,
    )
    if (duplicate) {
      props.onError(
        `Ky produkt eshte tashme ne liste: ${productLabel(
          duplicate.emri_produktit,
          duplicate.kodi_produktit,
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

  const busy = updateBatchMut.isPending || updateItemMut.isPending

  return (
    <div className="mobile-list-stack">
        <div>
          <label className="mobile-label">Data</label>
          <MobileDateInput value={data} onChange={setData} disabled={busy} aria-label="Data" placeholder="Data" />
        </div>

        {props.detail.lloji === 'Transfer' ? (
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
            disabled={busy || props.detail.mirrored_to_albania}
            sheetTitle="Shteti"
            onChange={setShteti}
          />
        )}

        <SheetConfirmButton
          label={updateBatchMut.isPending ? 'Duke ruajtur…' : 'Ruaj'}
          disabled={busy}
          loading={updateBatchMut.isPending}
          onClick={() => updateBatchMut.mutate()}
        />

        <div className="mobile-section-label">Produktet</div>
        {props.detail.items.map((item) => {
          const isEditing = props.editItemId === item.id
          return (
            <div key={item.id} className="mobile-summary-section">
              {isEditing && editDraft ? (
                <>
                  <div>
                    <label className="mobile-label">Produkti</label>
                    <select
                      className="mobile-select"
                      value={editDraft.kodi_produktit}
                      disabled={busy}
                      onChange={(e) => setEditDraft((d) => d && { ...d, kodi_produktit: e.target.value })}
                    >
                      <option value="">Zgjedh produktin…</option>
                      {productsByKodi.map((p) => (
                        <option
                          key={p.id}
                          value={p.kodi}
                          disabled={props.detail.items.some(
                            (x) => x.id !== item.id && x.kodi_produktit === p.kodi,
                          )}
                        >
                          {productLabel(p.emri, p.kodi)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mobile-field-row" style={{ marginTop: 8 }}>
                    <div>
                      <label className="mobile-label">Cmimi/Njesi</label>
                      <input
                        className="mobile-input"
                        type="number"
                        step="0.01"
                        min={0}
                        value={editDraft.cmimi_njesi}
                        disabled={busy}
                        onChange={(e) => setEditDraft((d) => d && { ...d, cmimi_njesi: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mobile-label">Sasia</label>
                      <input
                        className="mobile-input"
                        type="number"
                        min={1}
                        value={editDraft.sasia}
                        disabled={busy}
                        onChange={(e) => setEditDraft((d) => d && { ...d, sasia: e.target.value })}
                      />
                    </div>
                  </div>
                  <SheetFooterRow>
                    <SheetCancelButton
                      label="Anulo"
                      disabled={busy}
                      onClick={() => {
                        props.onEditItem(null)
                        setEditDraft(null)
                      }}
                    />
                    <SheetConfirmButton
                      label="Ruaj"
                      disabled={busy}
                      loading={updateItemMut.isPending}
                      onClick={() => saveEditItem(item.id)}
                    />
                  </SheetFooterRow>
                </>
              ) : (
                <>
                  <div className="mobile-card-label">{productLabel(item.emri_produktit, item.kodi_produktit)}</div>
                  <div className="mobile-card-meta">
                    {fmtEuro(item.cmimi_njesi)} × {item.sasia} = {fmtEuro(item.totali)}
                  </div>
                  <SheetEditButton
                    label="Ndrysho produktin"
                    disabled={busy}
                    onClick={() => startEditItem(item)}
                  />
                </>
              )}
            </div>
          )
        })}
    </div>
  )
}
