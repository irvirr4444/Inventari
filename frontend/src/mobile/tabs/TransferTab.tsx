import * as React from 'react'
import { useTransferEntry } from '../../hooks/useTransferEntry'
import { useProductsQuery } from '../../hooks/useProductsQuery'
import type { Country } from '../../lib/country'
import { COUNTRY_META } from '../../lib/country'
import { countryLabel, fmtEuro } from '../../lib/format'
import { formatActionDateTime } from '../../lib/actionMeta'
import { createEmptyActionItem } from '../../types/actionItem'
import { BottomSheet } from '../components/BottomSheet'
import { SheetActionFooter } from '../components/SheetActions'
import { MobileDateInput } from '../components/MobileDateInput'
import { ProductPickerSheet, type ProductPickerSaveData } from '../components/ProductPickerSheet'
import { ProductRowCard } from '../components/ProductRowCard'
import { StickyCta } from '../components/StickyCta'
import { OraInput } from '../../components/OraInput'

function TransferCountryField(props: {
  label: string
  value: Country
  onOpen: () => void
}) {
  return (
    <div>
      <label className="mobile-label">{props.label}</label>
      <button type="button" className="mobile-tap-field" onClick={props.onOpen}>
        <span className="row mobile-tap-field-value" style={{ gap: 8, alignItems: 'center' }}>
          <img className="flagIcon" src={COUNTRY_META[props.value].flagSrc} alt="" width={20} height={14} />
          <span className="mobile-meta-truncate">{countryLabel(props.value)}</span>
        </span>
        <span aria-hidden="true">▾</span>
      </button>
    </div>
  )
}

function TransferCountrySelectSheet(props: {
  open: boolean
  title: string
  exclude?: Country
  onClose: () => void
  onSelect: (c: Country) => void
}) {
  return (
    <BottomSheet open={props.open} title={props.title} onClose={props.onClose}>
      <div className="mobile-list-stack">
        {(['XK', 'AL'] as Country[])
          .filter((c) => c !== props.exclude)
          .map((c) => (
            <button
              key={c}
              type="button"
              className="mobile-tap-field"
              onClick={() => {
                props.onSelect(c)
                props.onClose()
              }}
            >
              <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                <img className="flagIcon" src={COUNTRY_META[c].flagSrc} alt="" width={20} height={14} />
                {countryLabel(c)}
              </span>
            </button>
          ))}
      </div>
    </BottomSheet>
  )
}

export function TransferTab(props: {
  notify: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const productsQuery = useProductsQuery()
  const products = productsQuery.data ?? []
  const entry = useTransferEntry({ notify: props.notify })

  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const [fromOpen, setFromOpen] = React.useState(false)
  const [toOpen, setToOpen] = React.useState(false)

  const filledItems = entry.itemsState.items.filter((i) => i.kodi_produktit.trim())
  const editingItem = editingKey
    ? entry.itemsState.items.find((i) => i.key === editingKey)
    : null

  const openAdd = () => {
    setEditingKey(null)
    setPickerOpen(true)
  }

  const openEdit = (key: string) => {
    setEditingKey(key)
    setPickerOpen(true)
  }

  const handleSave = (data: ProductPickerSaveData) => {
    if (editingKey) {
      entry.itemsState.updateItem(editingKey, 'kodi_produktit', data.kodi_produktit)
      entry.itemsState.updateItem(editingKey, 'cmimi_njesi', data.cmimi_njesi)
      entry.itemsState.updateItem(editingKey, 'sasia', data.sasia)
      entry.itemsState.updateItem(editingKey, 'shenim', data.shenim)
    } else {
      const empty = entry.itemsState.items.find((i) => !i.kodi_produktit.trim())
      if (empty) {
        entry.itemsState.updateItem(empty.key, 'kodi_produktit', data.kodi_produktit)
        entry.itemsState.updateItem(empty.key, 'cmimi_njesi', data.cmimi_njesi)
        entry.itemsState.updateItem(empty.key, 'sasia', data.sasia)
        entry.itemsState.updateItem(empty.key, 'shenim', data.shenim)
      } else {
        const item = createEmptyActionItem()
        entry.itemsState.setItems([...entry.itemsState.items, { ...item, ...data }])
      }
    }
    setEditingKey(null)
  }

  return (
    <>
      <div className="mobile-tab-panel">
        <div className="mobile-field-row">
          <TransferCountryField label="Nga" value={entry.transferFrom} onOpen={() => setFromOpen(true)} />
          <TransferCountryField label="Te" value={entry.transferTo} onOpen={() => setToOpen(true)} />
        </div>

        <div className="mobile-field-row">
          <div>
            <label className="mobile-label">Data</label>
            <MobileDateInput
              value={entry.transferDate}
              onChange={entry.setTransferDate}
              aria-label="Data"
              placeholder="Data"
            />
          </div>
          <div>
            <label className="mobile-label" htmlFor="transfer-ora">
              Ora
            </label>
            <OraInput
              id="transfer-ora"
              className="mobile-input"
              value={entry.transferOra}
              onChange={entry.setTransferOra}
            />
          </div>
        </div>
        <div>
          <label className="mobile-label" htmlFor="transfer-pershkrimi">
            Pershkrimi
          </label>
          <input
            id="transfer-pershkrimi"
            type="text"
            className="mobile-input"
            value={entry.transferPershkrimi}
            onChange={(e) => entry.setTransferPershkrimi(e.target.value)}
            maxLength={500}
            placeholder="Opsionale"
          />
        </div>

        <div>
          <div className="mobile-section-label">Produktet</div>
          <button type="button" className="mobile-btn-outline" onClick={openAdd}>
            + Shto Produkt
          </button>
        </div>

        {filledItems.length > 0 ? (
          <div className="mobile-list-stack">
            {filledItems.map((item) => (
              <ProductRowCard
                key={item.key}
                item={item}
                products={products}
                onTap={() => openEdit(item.key)}
                onRemove={() => entry.itemsState.removeItem(item.key)}
                onShenimChange={(value) => entry.itemsState.updateItem(item.key, 'shenim', value)}
                onNotify={props.notify}
              />
            ))}
          </div>
        ) : null}

        {entry.transferError ? <div className="mobile-inline-error">{entry.transferError}</div> : null}

        <div className="mobile-total-row">
          <span>Totali:</span>
          <span className="mobile-num">{fmtEuro(entry.itemsState.total)}</span>
        </div>
      </div>

      <StickyCta
        label="FINALIZO TRANSFERTËN"
        disabled={!entry.hasValidItems}
        loading={entry.mutation.isPending}
        onClick={entry.requestFinalize}
      />

      <TransferCountrySelectSheet
        open={fromOpen}
        title="Nga"
        onClose={() => setFromOpen(false)}
        onSelect={entry.setTransferFrom}
      />
      <TransferCountrySelectSheet
        open={toOpen}
        title="Te"
        exclude={entry.transferFrom}
        onClose={() => setToOpen(false)}
        onSelect={entry.setTransferTo}
      />

      <ProductPickerSheet
        open={pickerOpen}
        title={editingKey ? 'Ndrysho produktin' : 'Shto produkt'}
        products={products}
        initial={
          editingItem
            ? {
                kodi_produktit: editingItem.kodi_produktit,
                cmimi_njesi: editingItem.cmimi_njesi,
                sasia: editingItem.sasia,
                shenim: editingItem.shenim,
              }
            : undefined
        }
        onClose={() => {
          setPickerOpen(false)
          setEditingKey(null)
        }}
        onSave={handleSave}
      />

      <BottomSheet
        open={entry.confirmOpen}
        title="Finalizo transfertën?"
        onClose={() => entry.setConfirmOpen(false)}
        footer={
          <SheetActionFooter
            onCancel={() => entry.setConfirmOpen(false)}
            confirmLabel={entry.mutation.isPending ? 'Duke finalizuar…' : 'Konfirmo'}
            confirmLoading={entry.mutation.isPending}
            onConfirm={() => entry.mutation.mutate()}
          />
        }
      >
        <p className="mobile-card-meta">
          Transfer nga {countryLabel(entry.transferFrom)} ne {countryLabel(entry.transferTo)},{' '}
          {filledItems.length} produkte, total{' '}
          <strong className="mobile-num">{fmtEuro(entry.itemsState.total)}</strong>.
          {entry.transferOra || entry.transferPershkrimi.trim() ? (
            <>
              {' '}
              {formatActionDateTime(entry.transferDate, entry.transferOra)}
              {entry.transferPershkrimi.trim() ? ` — ${entry.transferPershkrimi.trim()}` : ''}
            </>
          ) : null}
        </p>
      </BottomSheet>
    </>
  )
}
