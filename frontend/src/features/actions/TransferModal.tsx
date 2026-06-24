import * as React from 'react'
import { CountrySelect } from '../../components/CountrySelect'
import { Modal } from '../../components/Modal'
import type { Country } from '../../lib/country'
import type { Produkti } from '../../lib/api'
import { countryLabel, fmt } from '../../lib/format'
import type { ActionItemDraft } from '../../types/actionItem'
import { ActionItemsTable } from './ActionItemsTable'
import { ActionMetaFields } from './ActionMetaFields'

export function TransferModal(props: {
  from: Country
  to: Country
  date: string
  ora: string
  pershkrimi: string
  items: ActionItemDraft[]
  products: Produkti[]
  total: number
  saving: boolean
  onFromChange: (country: Country) => void
  onToChange: (country: Country) => void
  onDateChange: (date: string) => void
  onOraChange: (value: string) => void
  onPershkrimiChange: (value: string) => void
  onAddItem: () => void
  onRemoveItem: (key: string) => void
  onUpdateItem: (key: string, field: keyof ActionItemDraft, value: string | number) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
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
            <label className="label">Te</label>
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

        <ActionMetaFields
          layout="modal-row"
          date={props.date}
          onDateChange={props.onDateChange}
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
          onNotify={props.onNotify}
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
      </form>
    </Modal>
  )
}
