import type * as React from 'react'
import { Modal } from '../../components/Modal'
import type { DynamicProdukti } from '../../lib/api'
import type { ActionItemDraft } from '../../types/actionItem'
import { DynamicTransferForm } from './DynamicTransferForm'

export function DynamicTransferModal(props: {
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
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  return (
    <Modal
      open
      title="Transfero produktet"
      className="transfer-modal"
      onClose={props.onClose}
    >
      <DynamicTransferForm
        from={props.from}
        to={props.to}
        fromLabel={props.fromLabel}
        toLabel={props.toLabel}
        date={props.date}
        ora={props.ora}
        pershkrimi={props.pershkrimi}
        items={props.items}
        products={props.products}
        error={props.error}
        total={props.total}
        saving={props.saving}
        onFromChange={props.onFromChange}
        onToChange={props.onToChange}
        onDateChange={props.onDateChange}
        onOraChange={props.onOraChange}
        onPershkrimiChange={props.onPershkrimiChange}
        onAddItem={props.onAddItem}
        onRemoveItem={props.onRemoveItem}
        onUpdateItem={props.onUpdateItem}
        onNotify={props.onNotify}
        onSubmit={props.onSubmit}
      />
    </Modal>
  )
}
