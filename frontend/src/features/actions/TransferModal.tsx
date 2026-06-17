import * as React from 'react'
import { CountrySelect } from '../../components/CountrySelect'
import { DateInput } from '../../components/DateInput'
import { ErrorAlert } from '../../components/ErrorAlert'
import { Modal } from '../../components/Modal'
import type { Country } from '../../lib/country'
import type { Produkti } from '../../lib/api'
import { countryLabel, fmt } from '../../lib/format'
import type { ActionItemDraft } from '../../types/actionItem'
import { ActionItemsTable } from './ActionItemsTable'

export function TransferModal(props: {
  from: Country
  to: Country
  date: string
  items: ActionItemDraft[]
  products: Produkti[]
  error: string | null
  total: number
  saving: boolean
  onFromChange: (country: Country) => void
  onToChange: (country: Country) => void
  onDateChange: (date: string) => void
  onAddItem: () => void
  onRemoveItem: (key: string) => void
  onUpdateItem: (key: string, field: keyof ActionItemDraft, value: string | number) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  const updateFrom = (next: Country) => {
    props.onFromChange(next)
    if (next === props.to) props.onToChange(next === 'XK' ? 'AL' : 'XK')
  }

  return (
    <Modal
      open
      title="Transfero produktet"
      className="transfer-modal"
      onClose={props.onClose}
    >
      <form onSubmit={props.onSubmit}>
        <div className="transfer-route modal-transfer-route">
          <div className="form-group">
            <label className="label">Nga</label>
            <CountrySelect value={props.from} onChange={updateFrom} />
          </div>
          <div className="transfer-arrow" aria-hidden="true">
            →
          </div>
          <div className="form-group">
            <label className="label">Ne</label>
            <CountrySelect
              value={props.to}
              onChange={props.onToChange}
              disabledCountries={[props.from]}
            />
          </div>
          <div className="transfer-hint">
            Transfer: {countryLabel(props.from)} → {countryLabel(props.to)}
          </div>
        </div>

        <div className="row transfer-date-row" style={{ gap: 8, margin: '16px 0 20px' }}>
          <span className="muted" style={{ fontSize: 13 }}>Data e Veprimit</span>
          <DateInput value={props.date} onChange={props.onDateChange} style={{ width: 150 }} />
        </div>

        <ActionItemsTable
          items={props.items}
          products={props.products}
          onUpdate={props.onUpdateItem}
          onRemove={props.onRemoveItem}
        />

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

        {props.error && <ErrorAlert message={props.error} style={{ marginTop: 16 }} />}
      </form>
    </Modal>
  )
}
