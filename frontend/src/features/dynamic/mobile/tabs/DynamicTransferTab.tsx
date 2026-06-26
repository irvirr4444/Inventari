import * as React from 'react'
import { useDynamicProductsQuery } from '../../../../hooks/useDynamicProductsQuery'
import { useDynamicTransferEntry } from '../../../../hooks/useDynamicTransferEntry'
import { OraInput } from '../../../../components/OraInput'
import type { Produkti } from '../../../../lib/api'
import { fmtEuro } from '../../../../lib/format'
import { useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { useTenantConfig } from '../../../../hooks/useTenantConfig'
import { createEmptyActionItem } from '../../../../types/actionItem'
import { MobileActionReviewSheet } from '../../../../mobile/components/MobileActionReviewSheet'
import { MobileDateInput } from '../../../../mobile/components/MobileDateInput'
import { ProductPickerSheet, type ProductPickerSaveData } from '../../../../mobile/components/ProductPickerSheet'
import { ProductRowCard } from '../../../../mobile/components/ProductRowCard'
import { StickyCta } from '../../../../mobile/components/StickyCta'
import {
  DynamicLocationField,
  DynamicLocationPickerSheet,
} from '../components/DynamicLocationPickerSheet'

export function DynamicTransferTab(props: {
  notify: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const { trackPrice } = useTenantConfig()
  const { activeLokacionet } = useLokacioni()
  const sortedLocations = React.useMemo(
    () => [...activeLokacionet].sort((a, b) => a.rradhitja - b.rradhitja),
    [activeLokacionet],
  )
  const [initialFrom] = React.useState(() => sortedLocations[0]?.id ?? '')

  const productsQuery = useDynamicProductsQuery()
  const products = productsQuery.data ?? []
  const entry = useDynamicTransferEntry({
    activeLokacionet: sortedLocations,
    notify: props.notify,
    initialFrom,
  })

  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const [fromOpen, setFromOpen] = React.useState(false)
  const [toOpen, setToOpen] = React.useState(false)

  const filledItems = entry.itemsState.items.filter((i) => i.kodi_produktit.trim())
  const editingItem = editingKey
    ? entry.itemsState.items.find((i) => i.key === editingKey)
    : null
  const hasValidItems = filledItems.length > 0
  const pickerProducts = products as unknown as Produkti[]

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
      <div className="mobile-tab-panel mobile-tab-panel--action">
        <div className="mobile-action-top-slot">
          <div className="mobile-field-row mobile-action-top-loco-row">
            <DynamicLocationField
              label="Nga"
              value={entry.transferFrom}
              locations={sortedLocations}
              onOpen={() => setFromOpen(true)}
            />
            <DynamicLocationField
              label="Te"
              value={entry.transferTo}
              locations={sortedLocations}
              onOpen={() => setToOpen(true)}
            />
          </div>
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
            <label className="mobile-label" htmlFor="dynamic-transfer-ora">Ora</label>
            <OraInput
              id="dynamic-transfer-ora"
              className="mobile-input"
              value={entry.transferOra}
              onChange={entry.setTransferOra}
            />
          </div>
        </div>
        <div className="mobile-action-pershkrimi-row">
          <label className="mobile-label" htmlFor="dynamic-transfer-pershkrimi">Përshkrimi</label>
          <input
            id="dynamic-transfer-pershkrimi"
            type="text"
            className="mobile-input"
            value={entry.transferPershkrimi}
            onChange={(e) => entry.setTransferPershkrimi(e.target.value)}
            maxLength={500}
            placeholder="Opsionale"
          />
        </div>

        <div className="mobile-action-products-slot">
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
                products={pickerProducts}
                onTap={() => openEdit(item.key)}
                onRemove={() => entry.itemsState.removeItem(item.key)}
              />
            ))}
          </div>
        ) : null}

        {trackPrice ? (
          <div className="mobile-total-row">
            <span>Totali:</span>
            <span className="mobile-num">{fmtEuro(entry.itemsState.total)}</span>
          </div>
        ) : null}
      </div>

      <StickyCta
        label="FINALIZO TRANSFERTËN"
        disabled={!hasValidItems}
        loading={entry.mutation.isPending}
        onClick={entry.requestFinalize}
      />

      <DynamicLocationPickerSheet
        open={fromOpen}
        title="Nga"
        value={entry.transferFrom}
        allowAdd
        onNotify={props.notify}
        onClose={() => setFromOpen(false)}
        onSelect={entry.setTransferFrom}
      />
      <DynamicLocationPickerSheet
        open={toOpen}
        title="Te"
        value={entry.transferTo}
        allowAdd
        onNotify={props.notify}
        onClose={() => setToOpen(false)}
        onSelect={entry.setTransferTo}
      />

      <ProductPickerSheet
        open={pickerOpen}
        title={editingKey ? 'Ndrysho produktin' : 'Shto produkt'}
        products={pickerProducts}
        showPrice={trackPrice}
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
        lloji="Transfer"
        transferFromLocation={{
          emri: entry.fromLabel,
          flagEmoji: sortedLocations.find((l) => l.id === entry.transferFrom)?.flag_emoji,
        }}
        transferToLocation={{
          emri: entry.toLabel,
          flagEmoji: sortedLocations.find((l) => l.id === entry.transferTo)?.flag_emoji,
        }}
        items={entry.itemsState.items}
        products={products}
        total={entry.itemsState.total}
        actionDate={entry.transferDate}
        actionOra={entry.transferOra}
        actionPershkrimi={entry.transferPershkrimi}
        showPrice={trackPrice}
        loading={entry.mutation.isPending}
        onCancel={() => entry.setConfirmOpen(false)}
        onConfirm={() => entry.mutation.mutate()}
      />
    </>
  )
}
