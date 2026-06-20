import type * as React from 'react'
import { DateInput } from '../../components/DateInput'
import { ErrorAlert } from '../../components/ErrorAlert'
import type { DynamicProdukti } from '../../lib/api'
import { fmt } from '../../lib/format'
import type { ActionItemDraft } from '../../types/actionItem'
import { ActionItemsTable } from '../actions/ActionItemsTable'
import { ActionMetaFields } from '../actions/ActionMetaFields'
import { DynamicLocationSelect } from './DynamicLocationSelect'

export function DynamicTransferForm(props: {
  from: string
  to: string
  fromLabel: string
  toLabel: string
  date: string
  ora: string
  pershkrimi: string
  items: ActionItemDraft[]
  products: DynamicProdukti[]
  error: string | null
  total: number
  saving: boolean
  onFromChange: (id: string) => void
  onToChange: (id: string) => void
  onDateChange: (date: string) => void
  onOraChange: (value: string) => void
  onPershkrimiChange: (value: string) => void
  onAddItem: () => void
  onRemoveItem: (key: string) => void
  onUpdateItem: (key: string, field: keyof ActionItemDraft, value: string | number) => void
  onSubmit: (e: React.FormEvent) => void
  hideInlineSubmit?: boolean
}) {
  const updateFrom = (next: string) => {
    props.onFromChange(next)
  }

  return (
    <form onSubmit={props.onSubmit} className="dynamic-transfer-form">
      <div className="transfer-route modal-transfer-route">
        <div className="form-group">
          <label className="label">Nga</label>
          <DynamicLocationSelect
            value={props.from}
            onChange={updateFrom}
            excludeIds={[props.to]}
          />
        </div>
        <div className="transfer-arrow" aria-hidden="true">→</div>
        <div className="form-group">
          <label className="label">Te</label>
          <DynamicLocationSelect
            value={props.to}
            onChange={props.onToChange}
            excludeIds={[props.from]}
          />
        </div>
        <div className="transfer-hint">
          Transfer: {props.fromLabel} → {props.toLabel}
        </div>
      </div>

      <div className="row transfer-date-row" style={{ gap: 8, margin: '16px 0 12px' }}>
        <span className="muted" style={{ fontSize: 13 }}>Data e Veprimit</span>
        <DateInput value={props.date} onChange={props.onDateChange} style={{ width: 150 }} />
      </div>

      <ActionMetaFields
        ora={props.ora}
        pershkrimi={props.pershkrimi}
        onOraChange={props.onOraChange}
        onPershkrimiChange={props.onPershkrimiChange}
        disabled={props.saving}
        className="transfer-meta-fields"
      />

      <ActionItemsTable
        items={props.items}
        products={props.products}
        onUpdate={props.onUpdateItem}
        onRemove={props.onRemoveItem}
      />

      {!props.hideInlineSubmit ? (
        <div className="row action-footer" style={{ marginTop: 16 }}>
          <button type="button" className="btn" onClick={props.onAddItem}>
            + Shto produkt
          </button>
          <div className="spacer" />
          <div className="row action-total" style={{ gap: 8 }}>
            <span className="muted">Total:</span>
            <span className="num-lg">{fmt(props.total)}</span>
          </div>
          <button
            type="submit"
            className="btn primary action-submit"
            disabled={props.saving}
            style={{ marginLeft: 16 }}
          >
            {props.saving ? 'Duke finalizuar…' : 'Finalizo Transfertën'}
          </button>
        </div>
      ) : (
        <div className="row action-footer" style={{ marginTop: 16 }}>
          <button type="button" className="btn" onClick={props.onAddItem}>
            + Shto produkt
          </button>
          <div className="spacer" />
          <div className="row action-total" style={{ gap: 8 }}>
            <span className="muted">Total:</span>
            <span className="num-lg">{fmt(props.total)}</span>
          </div>
        </div>
      )}

      {props.error && <ErrorAlert message={props.error} style={{ marginTop: 16 }} />}
    </form>
  )
}
