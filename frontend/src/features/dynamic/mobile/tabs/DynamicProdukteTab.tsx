import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { NumericInput } from '../../../../components/NumericInput'
import { useDynamicProductCrud } from '../../../../hooks/useDynamicProductCrud'
import { useDynamicProductsQuery } from '../../../../hooks/useDynamicProductsQuery'
import { stockRecord, type DynamicProdukti } from '../../../../lib/api'
import { productLabel, sortProductsByKodi } from '../../../../lib/format'
import {
  scheduleInvalidate,
  scheduleProductDeleteInvalidation,
} from '../../../../lib/invalidateAppData'
import { useAuth } from '../../../../lib/auth/AuthProvider'
import {
  canAddProducts,
  canEditDeleteInLocation,
  canEditDeleteProducts,
  isAdmin,
} from '../../../../lib/permissions'
import { useLokacioni } from '../../../../lib/lokacioni/LokacioniProvider'
import type { Lokacioni } from '../../../../lib/lokacioni/types'
import { MobileSheetStack } from '../../../../mobile/components/MobileSheetStack'
import { useFloatingScreenStack } from '../../../../mobile/hooks/useScreenStack'
import {
  SheetActionFooter,
  SheetConfirmButton,
  SheetEditButton,
  SheetFooterRow,
} from '../../../../mobile/components/SheetActions'
import { MobileProductListPending } from '../../../../mobile/components/MobileProductListPending'
import { DynamicProductCard } from '../components/DynamicProductCard'
import { DynamicMobileStockLevels } from '../components/DynamicMobileStockLevels'
import { LocationAddModal } from '../../../locations/LocationAddModal'

function DynamicProductFormFields(props: {
  kodi: string
  emri: string
  stock: Record<string, number>
  locations: Lokacioni[]
  error: string | null
  canEditProductDetails?: boolean
  editableLocationIds?: string[]
  onKodiChange: (v: string) => void
  onEmriChange: (v: string) => void
  onStockChange: (lokacioniId: string, value: number) => void
}) {
  const editableLocationIds = React.useMemo(
    () => new Set(props.editableLocationIds ?? props.locations.map((loc) => loc.id)),
    [props.editableLocationIds, props.locations],
  )
  const canEditProductDetails = props.canEditProductDetails ?? true

  return (
    <div className="mobile-list-stack">
      <div>
        <label className="mobile-label">Kodi</label>
        <input
          className="mobile-input"
          value={props.kodi}
          disabled={!canEditProductDetails}
          onChange={(e) => props.onKodiChange(e.target.value)}
        />
      </div>
      <div>
        <label className="mobile-label">Emri</label>
        <input
          className="mobile-input"
          value={props.emri}
          disabled={!canEditProductDetails}
          onChange={(e) => props.onEmriChange(e.target.value)}
        />
      </div>
      <div className="dynamic-mobile-product-form-stocks">
        {props.locations.map((loc) => {
          const canEdit = editableLocationIds.has(loc.id)
          return (
            <div key={loc.id}>
              <label className="mobile-label">
                {loc.flag_emoji ?? '📍'} {loc.emri}
              </label>
              <NumericInput
                className="mobile-input"
                min={0}
                value={props.stock[loc.id] ?? 0}
                disabled={!canEdit}
                onChange={(v) => props.onStockChange(loc.id, v === '' ? 0 : Number(v))}
              />
            </div>
          )
        })}
      </div>
      {props.error ? <div className="mobile-inline-error">{props.error}</div> : null}
    </div>
  )
}

type DynamicProductScreen =
  | { type: 'detail'; product: DynamicProdukti }
  | { type: 'add' }
  | { type: 'edit'; product: DynamicProdukti }
  | { type: 'delete'; product: DynamicProdukti }

export function DynamicProdukteTab(props: {
  notify: (message: string, variant?: 'success' | 'default') => void
}) {
  const productsQuery = useDynamicProductsQuery()
  const qc = useQueryClient()
  const { user } = useAuth()
  const { activeLokacionet } = useLokacioni()
  const sortedLocations = React.useMemo(
    () => [...activeLokacionet].sort((a, b) => a.rradhitja - b.rradhitja),
    [activeLokacionet],
  )
  const crud = useDynamicProductCrud()
  const sheet = useFloatingScreenStack<DynamicProductScreen>()
  const canAddProduct = canAddProducts(user)
  const canEditProduct = canEditDeleteProducts(user)
  const canDeleteProduct = canEditDeleteProducts(user)
  const canEditProductDetails = isAdmin(user)
  const editableProductLocationIds = React.useMemo(
    () =>
      sortedLocations
        .filter((loc) => canEditDeleteInLocation(user, loc.id))
        .map((loc) => loc.id),
    [sortedLocations, user],
  )
  const [search, setSearch] = React.useState('')
  const [addLocationOpen, setAddLocationOpen] = React.useState(false)

  const [newKodi, setNewKodi] = React.useState('')
  const [newEmri, setNewEmri] = React.useState('')
  const [newStock, setNewStock] = React.useState<Record<string, number>>({})

  const [editDraft, setEditDraft] = React.useState<{
    product: DynamicProdukti
    stock: Record<string, number>
  } | null>(null)

  const initStock = () => {
    const stock: Record<string, number> = {}
    for (const loc of sortedLocations) stock[loc.id] = 0
    setNewStock(stock)
  }

  const products = React.useMemo(() => {
    const sorted = sortProductsByKodi(productsQuery.data ?? [])
    const q = search.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(
      (p) => p.kodi.toLowerCase().includes(q) || p.emri.toLowerCase().includes(q),
    )
  }, [productsQuery.data, search])

  const resetAddForm = () => {
    setNewKodi('')
    setNewEmri('')
    initStock()
    crud.setProductError(null)
  }

  const submitAdd = () => {
    crud.setProductError(null)
    if (!newKodi.trim() || !newEmri.trim()) {
      crud.setProductError('Kodi dhe Emri jane te detyrueshem.')
      return
    }
    crud.createMut.mutate(
      { kodi: newKodi.trim(), emri: newEmri.trim() },
      {
        onSuccess: (created) => {
          const stockRows = sortedLocations.map((loc) => ({
            lokacioni_id: loc.id,
            sasia: newStock[loc.id] ?? 0,
          }))
          const hasStock = stockRows.some((s) => s.sasia > 0)
          const finish = () => {
            resetAddForm()
            sheet.close()
            props.notify('Produkti u shtua me sukses.', 'success')
            scheduleInvalidate(qc, 'products', { userId: user?.id })
          }
          if (hasStock) {
            crud.updateMut.mutate(
              {
                id: created.id,
                stock: stockRows,
              },
              { onSuccess: finish },
            )
          } else {
            finish()
          }
        },
      },
    )
  }

  const openEdit = (p: DynamicProdukti) => {
    setEditDraft({ product: p, stock: stockRecord(p) })
    sheet.push({ type: 'edit', product: p })
  }

  const submitEdit = () => {
    if (!editDraft) return
    const editableLocationIds = new Set(editableProductLocationIds)
    const stock = sortedLocations
      .filter((loc) => editableLocationIds.has(loc.id))
      .map((loc) => ({
        lokacioni_id: loc.id,
        sasia: editDraft.stock[loc.id] ?? 0,
      }))
    crud.updateMut.mutate(
      {
        id: editDraft.product.id,
        ...(canEditProductDetails ? { kodi: editDraft.product.kodi.trim() } : {}),
        ...(canEditProductDetails ? { emri: editDraft.product.emri.trim() } : {}),
        stock,
      },
      {
        onSuccess: () => {
          setEditDraft(null)
          sheet.close()
          props.notify('Produkti u perditesua me sukses.', 'success')
          scheduleInvalidate(qc, 'products', { userId: user?.id })
        },
      },
    )
  }

  const openAdd = () => {
    initStock()
    sheet.push({ type: 'add' })
  }

  const current = sheet.current
  let sheetTitle: React.ReactNode = ''
  let sheetFooter: React.ReactNode

  if (current?.type === 'detail') {
    sheetTitle = productLabel(current.product.emri, current.product.kodi)
    sheetFooter = (
      <SheetFooterRow>
        <SheetEditButton
          label="Ndrysho"
          onClick={() => openEdit(current.product)}
          disabled={!canEditProduct}
        />
        <SheetConfirmButton
          label="Fshi"
          variant="danger"
          icon="delete"
          onClick={() => sheet.push({ type: 'delete', product: current.product })}
          disabled={!canDeleteProduct}
        />
      </SheetFooterRow>
    )
  } else if (current?.type === 'add') {
    sheetTitle = 'Shto produkt'
    sheetFooter = (
      <SheetActionFooter
        onCancel={sheet.close}
        confirmLabel={crud.createMut.isPending || crud.updateMut.isPending ? 'Duke ruajtur…' : 'Ruaj'}
        confirmLoading={crud.createMut.isPending || crud.updateMut.isPending}
        onConfirm={submitAdd}
      />
    )
  } else if (current?.type === 'edit') {
    sheetTitle = 'Ndrysho produktin'
    sheetFooter = (
      <SheetActionFooter
        onCancel={sheet.pop}
        confirmLabel={crud.updateMut.isPending ? 'Duke ruajtur…' : 'Ruaj'}
        confirmLoading={crud.updateMut.isPending}
        onConfirm={submitEdit}
      />
    )
  } else if (current?.type === 'delete') {
    sheetTitle = 'Fshi produktin?'
    sheetFooter = (
      <SheetActionFooter
        onCancel={sheet.pop}
        confirmLabel={crud.deleteMut.isPending ? 'Duke fshire…' : 'Fshi'}
        confirmLoading={crud.deleteMut.isPending}
        confirmVariant="danger"
        confirmIcon="delete"
        onConfirm={() => {
          crud.deleteMut.mutate(current.product.id, {
            onSuccess: () => {
              sheet.close()
              props.notify('Produkti u fshi me sukses.', 'success')
              scheduleProductDeleteInvalidation(qc, user?.id)
            },
          })
        }}
      />
    )
  }

  const renderScreen = (screen: DynamicProductScreen) => {
    switch (screen.type) {
      case 'detail':
        return (
          <DynamicMobileStockLevels
            locations={sortedLocations}
            stock={stockRecord(screen.product)}
          />
        )
      case 'add':
        return (
          <DynamicProductFormFields
            kodi={newKodi}
            emri={newEmri}
            stock={newStock}
            locations={sortedLocations}
            error={crud.productError}
            onKodiChange={setNewKodi}
            onEmriChange={setNewEmri}
            onStockChange={(id, v) => setNewStock((prev) => ({ ...prev, [id]: v }))}
          />
        )
      case 'edit':
        return editDraft ? (
          <DynamicProductFormFields
            kodi={editDraft.product.kodi}
            emri={editDraft.product.emri}
            stock={editDraft.stock}
            locations={sortedLocations}
            error={crud.productError}
            canEditProductDetails={canEditProductDetails}
            editableLocationIds={editableProductLocationIds}
            onKodiChange={(v) =>
              setEditDraft((d) => d && { ...d, product: { ...d.product, kodi: v } })
            }
            onEmriChange={(v) =>
              setEditDraft((d) => d && { ...d, product: { ...d.product, emri: v } })
            }
            onStockChange={(id, v) =>
              setEditDraft((d) => d && { ...d, stock: { ...d.stock, [id]: v } })
            }
          />
        ) : null
      case 'delete':
        return (
          <p className="mobile-card-meta">
            Produkti &quot;{productLabel(screen.product.emri, screen.product.kodi)}&quot; do te fshihet
            bashke me historikun e veprimeve te tij.
          </p>
        )
      default:
        return null
    }
  }

  return (
    <>
      <div className="mobile-tab-panel mobile-tab-panel--action dynamic-produkte-panel">
        <div className="dynamic-produkte-toolbar">
          <div className="mobile-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              className="mobile-search-input"
              placeholder="Kërko produkt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!productsQuery.isLoading ? (
            <div className="dynamic-produkte-add-row">
              <button
                type="button"
                className="mobile-btn-outline dynamic-produkte-add-btn"
                onClick={openAdd}
                disabled={!canAddProduct}
              >
                + Shto produkt
              </button>
              {isAdmin(user) ? (
              <button
                type="button"
                className="mobile-btn-outline dynamic-produkte-add-btn"
                onClick={() => setAddLocationOpen(true)}
              >
                + Shto vendndodhje
              </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {productsQuery.isLoading ? (
          <MobileProductListPending count={5} variant="dynamic" />
        ) : products.length === 0 ? (
          <div className="mobile-empty">
            <div className="mobile-empty-title">Nuk ka produkte</div>
          </div>
        ) : (
          <div className="dynamic-produkte-list mobile-panel-enter">
            {products.map((p) => (
              <DynamicProductCard
                key={p.id}
                product={p}
                locations={sortedLocations}
                onTap={() => sheet.push({ type: 'detail', product: p })}
              />
            ))}
          </div>
        )}
      </div>

      <MobileSheetStack
        open={sheet.open}
        nav={sheet.nav}
        panelCount={sheet.panelCount}
        panelWidth={sheet.panelWidth}
        trackStyle={sheet.trackStyle}
        transitionLocked={sheet.transitionLocked}
        animating={sheet.animating}
        canPop={sheet.canPop}
        onPop={sheet.pop}
        onClose={sheet.close}
        title={sheetTitle}
        footer={sheetFooter}
        className="mobile-sheet--chrome"
      >
        {sheet.screens.map((screen, index) => (
          <React.Fragment key={index}>{renderScreen(screen)}</React.Fragment>
        ))}
      </MobileSheetStack>

      <LocationAddModal
        open={addLocationOpen}
        onClose={() => setAddLocationOpen(false)}
        onCreated={() => {
          setAddLocationOpen(false)
          props.notify('Vendndodhja u shtua me sukses.', 'success')
        }}
      />
    </>
  )
}
