import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import type { ActionBatchDetail, DynamicProdukti } from '../../lib/api'
import { fmtEuro } from '../../lib/format'
import { DateInput } from '../../components/DateInput'
import { NumericInput } from '../../components/NumericInput'
import { OraInput } from '../../components/OraInput'
import { ProductSearchSelect } from '../../components/ProductSearchSelect'
import {
  dynamicMetaFromDetail,
  saveDynamicHistoryBatchEdits,
  type DynamicHistoryBatchMetaDraft,
} from '../../lib/dynamicHistoryBatchEdit'
import { rowsFromDetail, type HistoryEditRow } from '../../lib/historyBatchEdit'
import type { HistoryEditSaveResult } from '../history/historyEditSave'
import { DynamicLocationSelect } from './DynamicLocationSelect'

const HISTORY_EDIT_COL_WIDTHS = ['40%', '22%', '15%', '23%'] as const

function HistoryEditColgroup() {
  return (
    <colgroup>
      {HISTORY_EDIT_COL_WIDTHS.map((width, i) => (
        <col key={i} style={{ width }} />
      ))}
    </colgroup>
  )
}

export function DynamicActionEditForm(props: {
  detail: ActionBatchDetail
  products: DynamicProdukti[]
  disabled: boolean
  onSaveComplete: (result: HistoryEditSaveResult) => void
  onError: (message: string) => void
}) {
  const [meta, setMeta] = React.useState<DynamicHistoryBatchMetaDraft>(() =>
    dynamicMetaFromDetail(props.detail),
  )
  const [rows, setRows] = React.useState<HistoryEditRow[]>(() =>
    rowsFromDetail(props.detail.items),
  )

  React.useEffect(() => {
    setMeta(dynamicMetaFromDetail(props.detail))
    setRows(rowsFromDetail(props.detail.items))
  }, [props.detail])

  const saveMut = useMutation({
    mutationFn: () => saveDynamicHistoryBatchEdits({ detail: props.detail, meta, rows }),
    onSuccess: props.onSaveComplete,
    onError: (e) => props.onError(e instanceof Error ? e.message : 'Error'),
  })

  const updateRow = (key: string, patch: Partial<HistoryEditRow['draft']>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.key === key ? { ...row, draft: { ...row.draft, ...patch } } : row,
      ),
    )
  }

  const actionTotal = rows.reduce(
    (sum, row) =>
      sum + (Number(row.draft.cmimi_njesi) || 0) * (Number(row.draft.sasia) || 0),
    0,
  )

  const busy = props.disabled || saveMut.isPending

  return (
    <>
      <div className="history-detail-meta">
        <div className="history-detail-meta-row">
          <div className="form-group">
            <label className="label">Data</label>
            <DateInput
              value={meta.data}
              onChange={(v) => setMeta((m) => ({ ...m, data: v }))}
              disabled={busy}
            />
          </div>

          {props.detail.lloji === 'Transfer' ? (
            <>
              <div className="form-group">
                <label className="label">Nga</label>
                <DynamicLocationSelect
                  value={meta.lokacioni_id}
                  onChange={(id) =>
                    setMeta((m) => ({
                      ...m,
                      lokacioni_id: id,
                      destination_lokacioni_id:
                        m.destination_lokacioni_id === id ? '' : m.destination_lokacioni_id,
                    }))
                  }
                  excludeIds={[meta.destination_lokacioni_id]}
                />
              </div>
              <div className="form-group">
                <label className="label">Te</label>
                <DynamicLocationSelect
                  value={meta.destination_lokacioni_id}
                  onChange={(id) => setMeta((m) => ({ ...m, destination_lokacioni_id: id }))}
                  excludeIds={[meta.lokacioni_id]}
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="label">Lokacioni</label>
              <DynamicLocationSelect
                value={meta.lokacioni_id}
                onChange={(id) => setMeta((m) => ({ ...m, lokacioni_id: id }))}
              />
            </div>
          )}
        </div>

        <div className="history-detail-meta-row history-detail-meta-row-secondary">
          <div className="form-group">
            <label className="label">Ora</label>
            <OraInput
              variant="compact"
              value={meta.ora}
              onChange={(v) => setMeta((m) => ({ ...m, ora: v }))}
              disabled={busy}
            />
          </div>
          <div className="form-group history-edit-pershkrimi">
            <label className="label">Pershkrimi</label>
            <input
              className="input"
              value={meta.pershkrimi}
              onChange={(e) => setMeta((m) => ({ ...m, pershkrimi: e.target.value }))}
              disabled={busy}
            />
          </div>
        </div>
      </div>

      <div className="history-edit-table-wrap">
        <table className="table table-fixed history-edit-table history-edit-table-head">
          <HistoryEditColgroup />
          <thead>
            <tr>
              <th>Produkti</th>
              <th>Cmimi/Njesi</th>
              <th>Sasia</th>
              <th style={{ textAlign: 'right' }}>Totali</th>
            </tr>
          </thead>
        </table>
        <div className="history-edit-rows">
          <table className="table table-fixed history-edit-table history-edit-table-body">
            <HistoryEditColgroup />
            <tbody>
              {rows.map((row) => {
                const lineTotal =
                  (Number(row.draft.cmimi_njesi) || 0) * (Number(row.draft.sasia) || 0)
                return (
                  <tr key={row.key}>
                    <td>
                      <ProductSearchSelect
                        products={props.products}
                        value={row.draft.kodi_produktit}
                        onChange={(kodi) => updateRow(row.key, { kodi_produktit: kodi })}
                        disabled={busy}
                      />
                    </td>
                    <td>
                      <NumericInput
                        className="input"
                        step="0.01"
                        min={0}
                        value={row.draft.cmimi_njesi}
                        onChange={(v) => updateRow(row.key, { cmimi_njesi: String(v) })}
                        disabled={busy}
                      />
                    </td>
                    <td>
                      <NumericInput
                        className="input"
                        min={1}
                        value={row.draft.sasia}
                        onChange={(v) => updateRow(row.key, { sasia: String(v) })}
                        disabled={busy}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="num">{fmtEuro(lineTotal)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="history-edit-footer">
        <div className="history-expanded-total">
          Totali: <strong className="num">{fmtEuro(actionTotal)}</strong>
        </div>
        <div className="history-edit-actions">
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
          </button>
        </div>
      </div>
    </>
  )
}
