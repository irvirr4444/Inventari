import * as React from 'react'
import { useDynamicActionEntry } from '../../../../hooks/useDynamicActionEntry'
import { useDynamicProductsQuery } from '../../../../hooks/useDynamicProductsQuery'
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
import { SegmentedControl } from '../../../../mobile/components/SegmentedControl'
import { StickyCta } from '../../../../mobile/components/StickyCta'
import {
  DynamicLocationField,
  DynamicLocationPickerSheet,
} from '../components/DynamicLocationPickerSheet'

export function DynamicVeprimeTab(props: {
  notify: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const { trackPrice } = useTenantConfig()
  const { activeLokacionet } = useLokacioni()
  const sortedLocations = React.useMemo(
    () => [...activeLokacionet].sort((a, b) => a.rradhitja - b.rradhitja),
    [activeLokacionet],
  )
  const [lokacioniId, setLokacioniId] = React.useState(() => sortedLocations[0]?.id ?? '')

  React.useEffect(() => {
    if (!sortedLocations.some((l) => l.id === lokacioniId)) {
      setLokacioniId(sortedLocations[0]?.id ?? '')
    }
  }, [sortedLocations, lokacioniId])

  const productsQuery = useDynamicProductsQuery()
  const products = productsQuery.data ?? []
  const entry = useDynamicActionEntry({ lokacioniId, products, notify: props.notify })

  const [locationOpen, setLocationOpen] = React.useState(false)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [editingKey, setEditingKey] = React.useState<string | null>(null)

  const filledItems = entry.itemsState.items.filter((i) => i.kodi_produktit.trim())
  const existingKodis = filledItems.map((i) => i.kodi_produktit)
  const editingItem = editingKey
    ? entry.itemsState.items.find((i) => i.key === editingKey)
    : null
  const selectedLocation = sortedLocations.find((l) => l.id === lokacioniId)
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
        <SegmentedControl<'Hyrje' | 'Dalje'>
          value={entry.lloji}
          options={[
            { value: 'Hyrje', label: 'Hyrje', tone: 'success' },
            { value: 'Dalje', label: 'Dalje', tone: 'danger' },
          ]}
          onChange={entry.setLloji}
        />

        <div className="mobile-field-row">
          <DynamicLocationField
            label="Lokacioni"
            value={lokacioniId}
            locations={sortedLocations}
            onOpen={() => setLocationOpen(true)}
          />
          <div>
            <label className="mobile-label">Data</label>
            <MobileDateInput
              value={entry.actionDate}
              onChange={entry.setActionDate}
              aria-label="Data"
              placeholder="Data"
            />
          </div>
        </div>

        <div className="mobile-field-row">
          <div>
            <label className="mobile-label" htmlFor="dynamic-veprime-ora">Ora</label>
            <OraInput
              id="dynamic-veprime-ora"
              className="mobile-input"
              value={entry.actionOra}
              onChange={entry.setActionOra}
            />
          </div>
        </div>
        <div>
          <label className="mobile-label" htmlFor="dynamic-veprime-pershkrimi">Pershkrimi</label>
          <input
            id="dynamic-veprime-pershkrimi"
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
        label="FINALIZO"
        disabled={!hasValidItems}
        loading={entry.mutation.isPending}
        onClick={entry.requestFinalize}
      />

      <DynamicLocationPickerSheet
        open={locationOpen}
        title="Lokacioni"
        value={lokacioniId}
        allowAdd
        onNotify={props.notify}
        onClose={() => setLocationOpen(false)}
        onSelect={setLokacioniId}
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
        title="Finalizo veprimin?"
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
          {entry.lloji} ne {selectedLocation?.emri ?? 'lokacion'}
          {trackPrice ? (
            <>
              {' '}
              me total <strong className="mobile-num">{fmtEuro(entry.itemsState.total)}</strong>
            </>
          ) : null}
          .
          {entry.actionOra || entry.actionPershkrimi.trim() ? (
            <>
              {' '}
              {formatActionDateTime(entry.actionDate, entry.actionOra)}
              {entry.actionPershkrimi.trim() ? ` — ${entry.actionPershkrimi.trim()}` : ''}
            </>
          ) : null}
        </p>
      </BottomSheet>
    </>
  )
}
