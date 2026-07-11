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
import { BottomSheet } from '../../../../mobile/components/BottomSheet'
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
  const [detailProduct, setDetailProduct] = React.useState<DynamicProdukti | null>(null)
  const [addOpen, setAddOpen] = React.useState(false)
  const [addLocationOpen, setAddLocationOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

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
            setAddOpen(false)
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
    setDetailProduct(null)
    setEditOpen(true)
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
          setEditOpen(false)
          setEditDraft(null)
          props.notify('Produkti u perditesua me sukses.', 'success')
          scheduleInvalidate(qc, 'products', { userId: user?.id })
        },
      },
    )
  }

  const openAdd = () => {
    initStock()
    setAddOpen(true)
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
                onTap={() => setDetailProduct(p)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        open={!!detailProduct}
        title={detailProduct ? productLabel(detailProduct.emri, detailProduct.kodi) : ''}
        onClose={() => setDetailProduct(null)}
        footer={
          detailProduct ? (
            <SheetFooterRow>
              <SheetEditButton
                label="Ndrysho"
                onClick={() => openEdit(detailProduct)}
                disabled={!canEditProduct}
              />
              <SheetConfirmButton
                label="Fshi"
                variant="danger"
                icon="delete"
                onClick={() => setDeleteOpen(true)}
                disabled={!canDeleteProduct}
              />
            </SheetFooterRow>
          ) : undefined
        }
      >
        {detailProduct ? (
          <DynamicMobileStockLevels
            locations={sortedLocations}
            stock={stockRecord(detailProduct)}
          />
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={addOpen}
        title="Shto produkt"
        onClose={() => {
          setAddOpen(false)
          resetAddForm()
        }}
        footer={
          <SheetActionFooter
            onCancel={() => setAddOpen(false)}
            confirmLabel={crud.createMut.isPending || crud.updateMut.isPending ? 'Duke ruajtur…' : 'Ruaj'}
            confirmLoading={crud.createMut.isPending || crud.updateMut.isPending}
            onConfirm={submitAdd}
          />
        }
      >
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
      </BottomSheet>

      <BottomSheet
        open={editOpen && !!editDraft}
        title="Ndrysho produktin"
        onClose={() => {
          setEditOpen(false)
          setEditDraft(null)
        }}
        footer={
          <SheetActionFooter
            onCancel={() => setEditOpen(false)}
            confirmLabel={crud.updateMut.isPending ? 'Duke ruajtur…' : 'Ruaj'}
            confirmLoading={crud.updateMut.isPending}
            onConfirm={submitEdit}
          />
        }
      >
        {editDraft ? (
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
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={deleteOpen && !!detailProduct}
        title="Fshi produktin?"
        onClose={() => setDeleteOpen(false)}
        footer={
          <SheetActionFooter
            onCancel={() => setDeleteOpen(false)}
            confirmLabel={crud.deleteMut.isPending ? 'Duke fshire…' : 'Fshi'}
            confirmLoading={crud.deleteMut.isPending}
            confirmVariant="danger"
            confirmIcon="delete"
            onConfirm={() => {
              if (!detailProduct) return
              crud.deleteMut.mutate(detailProduct.id, {
                onSuccess: () => {
                  setDeleteOpen(false)
                  setDetailProduct(null)
                  props.notify('Produkti u fshi me sukses.', 'success')
                  scheduleProductDeleteInvalidation(qc, user?.id)
                },
              })
            }}
          />
        }
      >
        {detailProduct ? (
          <p className="mobile-card-meta">
            Produkti &quot;{productLabel(detailProduct.emri, detailProduct.kodi)}&quot; do te fshihet
            bashke me historikun e veprimeve te tij.
          </p>
        ) : null}
      </BottomSheet>

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
