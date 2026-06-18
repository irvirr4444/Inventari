import * as React from 'react'
import { useTransferEntry } from '../../hooks/useTransferEntry'
import { useProductsQuery } from '../../hooks/useProductsQuery'
import type { Country } from '../../lib/country'
import { COUNTRY_META } from '../../lib/country'
import { countryLabel, fmtEuro } from '../../lib/format'
import { createEmptyActionItem } from '../../types/actionItem'
import { BottomSheet } from '../components/BottomSheet'
import { SheetActionFooter } from '../components/SheetActions'
import { MobileDateInput } from '../components/MobileDateInput'
import { ProductPickerSheet } from '../components/ProductPickerSheet'
import { ProductRowCard } from '../components/ProductRowCard'
import { StickyCta } from '../components/StickyCta'

function TransferCountryField(props: {
  label: string
  value: Country
  onOpen: () => void
}) {
  return (
    <div>
      <label className="mobile-label">{props.label}</label>
      <button type="button" className="mobile-tap-field" onClick={props.onOpen}>
        <span className="row" style={{ gap: 8, alignItems: 'center' }}>
          <img className="flagIcon" src={COUNTRY_META[props.value].flagSrc} alt="" width={20} height={14} />
          {countryLabel(props.value)}
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

export function TransferTab(props: { notify: (message: string, variant?: 'success' | 'default') => void }) {
  const productsQuery = useProductsQuery()
  const products = productsQuery.data ?? []
  const entry = useTransferEntry({ products, notify: props.notify })

  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const [fromOpen, setFromOpen] = React.useState(false)
  const [toOpen, setToOpen] = React.useState(false)

  const filledItems = entry.itemsState.items.filter((i) => i.kodi_produktit.trim())
  const existingKodis = filledItems.map((i) => i.kodi_produktit)
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

  const handleSave = (data: { kodi_produktit: string; cmimi_njesi: string; sasia: string }) => {
    if (editingKey) {
      entry.itemsState.updateItem(editingKey, 'kodi_produktit', data.kodi_produktit)
      entry.itemsState.updateItem(editingKey, 'cmimi_njesi', data.cmimi_njesi)
      entry.itemsState.updateItem(editingKey, 'sasia', data.sasia)
    } else {
      const empty = entry.itemsState.items.find((i) => !i.kodi_produktit.trim())
      if (empty) {
        entry.itemsState.updateItem(empty.key, 'kodi_produktit', data.kodi_produktit)
        entry.itemsState.updateItem(empty.key, 'cmimi_njesi', data.cmimi_njesi)
        entry.itemsState.updateItem(empty.key, 'sasia', data.sasia)
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
        <TransferCountryField label="Nga" value={entry.transferFrom} onOpen={() => setFromOpen(true)} />
        <TransferCountryField label="Ne" value={entry.transferTo} onOpen={() => setToOpen(true)} />
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
        title="Ne"
        exclude={entry.transferFrom}
        onClose={() => setToOpen(false)}
        onSelect={entry.setTransferTo}
      />

      <ProductPickerSheet
        open={pickerOpen}
        title={editingKey ? 'Ndrysho produktin' : 'Shto produkt'}
        products={products}
        existingKodis={existingKodis}
        initial={
          editingItem
            ? {
                kodi_produktit: editingItem.kodi_produktit,
                cmimi_njesi: editingItem.cmimi_njesi,
                sasia: editingItem.sasia,
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
        </p>
      </BottomSheet>
    </>
  )
}
