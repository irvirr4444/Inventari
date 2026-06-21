import * as React from 'react'
import { useDynamicProductsQuery } from '../../../../hooks/useDynamicProductsQuery'
import { useDynamicTransferEntry } from '../../../../hooks/useDynamicTransferEntry'
import { OraInput } from '../../../../components/OraInput'
import type { Produkti } from '../../../../lib/api'
import { fmtEuro } from '../../../../lib/format'
import { formatActionDateTime } from '../../../../lib/actionMeta'
import { useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import { useTenantConfig } from '../../../../hooks/useTenantConfig'
import { createEmptyActionItem } from '../../../../types/actionItem'
import { BottomSheet } from '../../../../mobile/components/BottomSheet'
import { SheetActionFooter } from '../../../../mobile/components/SheetActions'
import { MobileDateInput } from '../../../../mobile/components/MobileDateInput'
import { ProductPickerSheet } from '../../../../mobile/components/ProductPickerSheet'
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
    products,
    activeLokacionet: sortedLocations,
    notify: props.notify,
    initialFrom,
  })

  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const [fromOpen, setFromOpen] = React.useState(false)
  const [toOpen, setToOpen] = React.useState(false)

  const filledItems = entry.itemsState.items.filter((i) => i.kodi_produktit.trim())
  const existingKodis = filledItems.map((i) => i.kodi_produktit)
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
        <div className="mobile-field-row">
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
        <div>
          <label className="mobile-label" htmlFor="dynamic-transfer-pershkrimi">Pershkrimi</label>
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
                products={pickerProducts}
                onTap={() => openEdit(item.key)}
                onRemove={() => entry.itemsState.removeItem(item.key)}
              />
            ))}
          </div>
        ) : null}

        {entry.transferError ? (
          <div className="mobile-inline-error">{entry.transferError}</div>
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
        excludeIds={[entry.transferTo]}
        onClose={() => setFromOpen(false)}
        onSelect={entry.setTransferFrom}
      />
      <DynamicLocationPickerSheet
        open={toOpen}
        title="Te"
        value={entry.transferTo}
        excludeIds={[entry.transferFrom]}
        onClose={() => setToOpen(false)}
        onSelect={entry.setTransferTo}
      />

      <ProductPickerSheet
        open={pickerOpen}
        title={editingKey ? 'Ndrysho produktin' : 'Shto produkt'}
        products={pickerProducts}
        existingKodis={existingKodis}
        showPrice={trackPrice}
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
          Transfer nga {entry.fromLabel} ne {entry.toLabel},{' '}
          {filledItems.length} produkte
          {trackPrice ? (
            <>
              , total <strong className="mobile-num">{fmtEuro(entry.itemsState.total)}</strong>
            </>
          ) : null}
          .
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
