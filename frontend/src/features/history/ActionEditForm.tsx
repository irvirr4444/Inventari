import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Country } from '../../lib/country'
import {
  updateActionBatch,
  updateActionBatchItem,
  type ActionBatchDetail,
  type HistoryActionItem,
  type Produkti,
} from '../../lib/api'
import { fmtEuro, productLabel, sortProductsByKodi } from '../../lib/format'
import { invalidateAfterMutation } from '../../lib/invalidateAppData'
import { DateInput } from '../../components/DateInput'

export type EditSaveKind = 'action' | 'product'

export function ActionEditForm(props: {
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
    await invalidateAfterMutation(qc, 'all', { actionBatchId: props.detail.id })
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
