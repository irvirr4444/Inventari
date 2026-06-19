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
import { fmtEuro, productLabel } from '../../lib/format'
import { invalidateAfterMutation } from '../../lib/invalidateAppData'
import { isLegacyBatchId } from '../../lib/actionBatch'
import { formatDisplayTime } from '../../lib/actionMeta'
import { DateInput } from '../../components/DateInput'
import { NumericInput } from '../../components/NumericInput'
import { OraInput } from '../../components/OraInput'
import { ProductSearchSelect } from '../../components/ProductSearchSelect'

type ItemDraft = {
  kodi_produktit: string
  cmimi_njesi: string
  sasia: string
}

function draftsFromItems(items: HistoryActionItem[]): Record<string, ItemDraft> {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        kodi_produktit: item.kodi_produktit,
        cmimi_njesi: String(item.cmimi_njesi),
        sasia: String(item.sasia),
      },
    ]),
  )
}

function lineTotal(draft: ItemDraft): number {
  return (Number(draft.cmimi_njesi) || 0) * (Number(draft.sasia) || 0)
}

function itemChanged(item: HistoryActionItem, draft: ItemDraft): boolean {
  return (
    draft.kodi_produktit !== item.kodi_produktit ||
    Number(draft.cmimi_njesi) !== item.cmimi_njesi ||
    Number(draft.sasia) !== item.sasia
  )
}

const HISTORY_EDIT_COL_WIDTHS = ['40%', '22%', '15%', '23%'] as const
const ACTION_VISIBLE_ROWS = 2

function HistoryEditColgroup() {
  return (
    <colgroup>
      {HISTORY_EDIT_COL_WIDTHS.map((width, i) => (
        <col key={i} style={{ width }} />
      ))}
    </colgroup>
  )
}

export function ActionEditForm(props: {
  detail: ActionBatchDetail
  products: Produkti[]
  disabled: boolean
  onSaveComplete: () => void
  onError: (message: string) => void
}) {
  const qc = useQueryClient()
  const isLegacy = isLegacyBatchId(props.detail.id)
  const [data, setData] = React.useState(props.detail.data)
  const [ora, setOra] = React.useState(formatDisplayTime(props.detail.ora))
  const [pershkrimi, setPershkrimi] = React.useState(props.detail.pershkrimi ?? '')
  const [shteti, setShteti] = React.useState<Country>(props.detail.shteti)
  const [destination, setDestination] = React.useState<Country | ''>(
    props.detail.destination_shteti ?? '',
  )
  const [itemDrafts, setItemDrafts] = React.useState<Record<string, ItemDraft>>(() =>
    draftsFromItems(props.detail.items),
  )

  const localItems = props.detail.items

  React.useEffect(() => {
    setData(props.detail.data)
    setOra(formatDisplayTime(props.detail.ora))
    setPershkrimi(props.detail.pershkrimi ?? '')
    setShteti(props.detail.shteti)
    setDestination(props.detail.destination_shteti ?? '')
    setItemDrafts(draftsFromItems(props.detail.items))
  }, [props.detail])

  const invalidateAll = React.useCallback(async () => {
    await invalidateAfterMutation(qc, 'all', { actionBatchId: props.detail.id })
  }, [qc, props.detail.id])

  const saveAllMut = useMutation({
    mutationFn: async () => {
      for (const item of localItems) {
        const draft = itemDrafts[item.id]
        if (!draft?.kodi_produktit) {
          throw new Error('Zgjidh produktin per cdo rresht.')
        }
        if (Number(draft.sasia) <= 0) {
          throw new Error('Sasia duhet te jete > 0.')
        }
      }

      const kodis = localItems.map((item) => itemDrafts[item.id]?.kodi_produktit).filter(Boolean)
      const duplicate = kodis.find((kodi, i) => kodis.indexOf(kodi) !== i)
      if (duplicate) {
        const dupItem = localItems.find((it) => itemDrafts[it.id]?.kodi_produktit === duplicate)
        throw new Error(
          dupItem
            ? `Ky produkt eshte dy here ne liste: ${productLabel(
                dupItem.emri_produktit,
                dupItem.kodi_produktit,
              )}`
            : 'Produkti i njejte nuk mund te perseritet ne liste.',
        )
      }

      const batchPayload: {
        data: string
        shteti?: Country
        destination_shteti?: Country
        ora?: string | null
        pershkrimi?: string | null
      } = { data }
      if (props.detail.lloji === 'Transfer') {
        batchPayload.shteti = shteti
        if (destination) batchPayload.destination_shteti = destination as Country
      } else if (!props.detail.mirrored_to_albania) {
        batchPayload.shteti = shteti
      }
      if (!isLegacy) {
        batchPayload.ora = ora.trim() ? ora.trim() : null
        batchPayload.pershkrimi = pershkrimi.trim() ? pershkrimi.trim() : null
      }

      await updateActionBatch(props.detail.id, batchPayload)

      const changedItems = localItems.filter((item) => itemChanged(item, itemDrafts[item.id]))
      await Promise.all(
        changedItems.map((item) => {
          const draft = itemDrafts[item.id]
          return updateActionBatchItem(props.detail.id, item.id, {
            kodi_produktit: draft.kodi_produktit,
            cmimi_njesi: Number(draft.cmimi_njesi) || 0,
            sasia: Number(draft.sasia) || 0,
          })
        }),
      )
    },
    onSuccess: async () => {
      await invalidateAll()
      props.onSaveComplete()
    },
    onError: (e) => props.onError(e instanceof Error ? e.message : 'Error'),
  })

  const updateFrom = (next: Country) => {
    setShteti(next)
    if (props.detail.lloji === 'Transfer' && next === destination) {
      setDestination(next === 'XK' ? 'AL' : 'XK')
    }
  }

  const updateDraft = (itemId: string, patch: Partial<ItemDraft>) => {
    setItemDrafts((prev) => {
      const current = prev[itemId]
      if (!current) return prev
      return { ...prev, [itemId]: { ...current, ...patch } }
    })
  }

  const actionTotal = localItems.reduce((sum, item) => {
    const draft = itemDrafts[item.id]
    return sum + (draft ? lineTotal(draft) : item.totali)
  }, 0)

  const busy = props.disabled || saveAllMut.isPending
  const showScrollHint = localItems.length > ACTION_VISIBLE_ROWS

  return (
    <>
      <div className="history-detail-meta">
        <div className="history-detail-meta-row">
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
        </div>

        <div className="history-detail-meta-row history-detail-meta-row-secondary">
          <div className="form-group">
            <label className="label" htmlFor="history-edit-ora">
              Ora
            </label>
            <OraInput
              id="history-edit-ora"
              variant="compact"
              value={ora}
              onChange={setOra}
              disabled={busy || isLegacy}
            />
          </div>
          <div className="form-group history-edit-pershkrimi">
            <label className="label" htmlFor="history-edit-pershkrimi">
              Pershkrimi
            </label>
            <input
              id="history-edit-pershkrimi"
              type="text"
              className="input"
              value={pershkrimi}
              onChange={(e) => setPershkrimi(e.target.value)}
              disabled={busy || isLegacy}
              maxLength={500}
              placeholder="Opsionale"
            />
          </div>
        </div>
      </div>

      <div className="history-subtable-wrap">
        <div className="action-table-hscroll table-scroll">
          <div className="action-table-inner">
            <table className="table table-fixed history-subtable action-table action-table-head">
              <HistoryEditColgroup />
              <thead>
                <tr>
                  <th>Produkti</th>
                  <th className="history-subtable-money">Cmimi/Njesi</th>
                  <th className="history-subtable-qty">Sasia</th>
                  <th className="history-subtable-money">Totali</th>
                </tr>
              </thead>
            </table>
            <div className="action-rows-scroll">
              <table className="table table-fixed history-subtable action-table action-table-body">
                <HistoryEditColgroup />
                <tbody>
                  {localItems.map((item) => {
                    const draft = itemDrafts[item.id]
                    if (!draft) return null

                    return (
                      <tr key={item.id}>
                        <td>
                          <ProductSearchSelect
                            products={props.products}
                            value={draft.kodi_produktit}
                            disabled={busy}
                            onChange={(kodi) => updateDraft(item.id, { kodi_produktit: kodi })}
                            disabledKodis={localItems
                              .filter((x) => x.id !== item.id)
                              .map((x) => itemDrafts[x.id]?.kodi_produktit)
                              .filter((k): k is string => Boolean(k))}
                            placeholder="Kerko sipas kodit ose emrit…"
                          />
                        </td>
                        <td>
                          <NumericInput
                            className="input"
                            step="0.01"
                            min={0}
                            disabled={busy}
                            value={draft.cmimi_njesi}
                            onChange={(v) => updateDraft(item.id, { cmimi_njesi: v })}
                            placeholder="0.00"
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>
                          <NumericInput
                            className="input"
                            min={1}
                            disabled={busy}
                            value={draft.sasia}
                            onChange={(v) => updateDraft(item.id, { sasia: v })}
                            placeholder="1"
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td className="history-subtable-money">
                          <span className="num">{fmtEuro(lineTotal(draft))}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p
              className={`action-rows-scroll-hint${showScrollHint ? '' : ' is-hidden'}`}
              aria-live="polite"
              aria-hidden={!showScrollHint}
            >
              {showScrollHint
                ? `↕ ${localItems.length} produkte — scroll për të parë të gjitha`
                : null}
            </p>
          </div>
        </div>
      </div>

      <div className="history-edit-modal-footer">
        <div className="history-expanded-total">
          Totali i veprimit: <strong>{fmtEuro(actionTotal)}</strong>
        </div>
        <button
          type="button"
          className="btn primary history-edit-save-btn"
          disabled={busy}
          onClick={() => saveAllMut.mutate()}
        >
          {saveAllMut.isPending ? 'Duke ruajtur…' : 'Ruaj'}
        </button>
      </div>
    </>
  )
}
