import * as React from 'react'
import { useActionEntry } from '../../hooks/useActionEntry'
import { useProductsQuery } from '../../hooks/useProductsQuery'
import { COUNTRY_META, useCountry } from '../../lib/country'
import { countryLabel, fmtEuro } from '../../lib/format'
import { createEmptyActionItem } from '../../types/actionItem'
import { MobileActionReviewSheet } from '../components/MobileActionReviewSheet'
import { CountryPickerSheet } from '../components/CountryPickerSheet'
import { MobileDateInput } from '../components/MobileDateInput'
import { ProductPickerSheet, type ProductPickerSaveData } from '../components/ProductPickerSheet'
import { ProductRowCard } from '../components/ProductRowCard'
import { SegmentedControl } from '../components/SegmentedControl'
import { StickyCta } from '../components/StickyCta'
import { OraInput } from '../../components/OraInput'

export function VeprimeTab(props: {
  notify: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const { country, setCountry } = useCountry()
  const productsQuery = useProductsQuery()
  const products = productsQuery.data ?? []
  const entry = useActionEntry({ notify: props.notify })

  const [countryOpen, setCountryOpen] = React.useState(false)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [editingKey, setEditingKey] = React.useState<string | null>(null)

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
        entry.itemsState.setItems([
          ...entry.itemsState.items,
          { ...item, ...data },
        ])
      }
    }
    setEditingKey(null)
  }

  return (
    <>
      <div className="mobile-tab-panel mobile-tab-panel--action">
        <div>
          <div className="mobile-section-label">Lloji i veprimit</div>
          <SegmentedControl<'Hyrje' | 'Dalje'>
            value={entry.lloji}
            options={[
              { value: 'Hyrje', label: 'Hyrje', tone: 'success' },
              { value: 'Dalje', label: 'Dalje', tone: 'danger' },
            ]}
            onChange={entry.setLloji}
          />
        </div>

        <div className="mobile-field-row">
          <button type="button" className="mobile-tap-field" onClick={() => setCountryOpen(true)}>
            <span className="row" style={{ gap: 8, alignItems: 'center' }}>
              <img className="flagIcon" src={COUNTRY_META[country].flagSrc} alt="" width={20} height={14} />
              {countryLabel(country)}
            </span>
            <span aria-hidden="true">▾</span>
          </button>
          <MobileDateInput
            value={entry.actionDate}
            onChange={entry.setActionDate}
            aria-label="Data"
            placeholder="Data"
          />
        </div>

        <div className="mobile-field-row">
          <div>
            <label className="mobile-label" htmlFor="veprime-ora">
              Ora
            </label>
            <OraInput
              id="veprime-ora"
              className="mobile-input"
              value={entry.actionOra}
              onChange={entry.setActionOra}
            />
          </div>
        </div>
        <div>
          <label className="mobile-label" htmlFor="veprime-pershkrimi">
            Përshkrimi
          </label>
          <input
            id="veprime-pershkrimi"
            type="text"
            className="mobile-input"
            value={entry.actionPershkrimi}
            onChange={(e) => entry.setActionPershkrimi(e.target.value)}
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
              />
            ))}
          </div>
        ) : null}

        <div className="mobile-total-row">
          <span>Totali:</span>
          <span className="mobile-num">{fmtEuro(entry.itemsState.total)}</span>
        </div>
      </div>

      <StickyCta
        label="FINALIZO VEPRIMIN"
        disabled={!entry.hasValidItems}
        loading={entry.mutation.isPending}
        onClick={entry.requestFinalize}
      />

      <CountryPickerSheet
        open={countryOpen}
        value={country}
        onClose={() => setCountryOpen(false)}
        onSelect={setCountry}
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

      <MobileActionReviewSheet
        open={entry.confirmOpen}
        lloji={entry.lloji}
        country={country}
        items={entry.itemsState.items}
        products={products}
        total={entry.itemsState.total}
        actionDate={entry.actionDate}
        actionOra={entry.actionOra}
        actionPershkrimi={entry.actionPershkrimi}
        loading={entry.mutation.isPending}
        onCancel={() => entry.setConfirmOpen(false)}
        onConfirm={() => entry.mutation.mutate()}
      />
    </>
  )
}
