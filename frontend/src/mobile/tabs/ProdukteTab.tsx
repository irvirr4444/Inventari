import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProductCrud } from '../../hooks/useProductCrud'
import { useProductsQuery } from '../../hooks/useProductsQuery'
import type { Produkti } from '../../lib/api'
import { productLabel, sortProductsByKodi } from '../../lib/format'
import {
  scheduleInvalidate,
  scheduleProductDeleteInvalidation,
} from '../../lib/invalidateAppData'
import { useAuth } from '../../lib/auth/AuthProvider'
import { NumericInput } from '../../components/NumericInput'
import { BottomSheet } from '../components/BottomSheet'
import { SheetActionFooter, SheetEditButton, SheetFooterRow, SheetConfirmButton } from '../components/SheetActions'
import { MobileProductListPending } from '../components/MobileProductListPending'
import { MobileStockLevels } from '../components/MobileStockLevels'

function ProductFormFields(props: {
  kodi: string
  emri: string
  gjendjeKosove: number
  gjendjeShqiperi: number
  error: string | null
  onKodiChange: (v: string) => void
  onEmriChange: (v: string) => void
  onGjendjeKosoveChange: (v: number) => void
  onGjendjeShqiperiChange: (v: number) => void
}) {
  return (
    <div className="mobile-list-stack">
      <div>
        <label className="mobile-label">Kodi</label>
        <input
          className="mobile-input"
          value={props.kodi}
          onChange={(e) => props.onKodiChange(e.target.value)}
        />
      </div>
      <div>
        <label className="mobile-label">Emri</label>
        <input
          className="mobile-input"
          value={props.emri}
          onChange={(e) => props.onEmriChange(e.target.value)}
        />
      </div>
      <div className="mobile-field-row">
        <div>
          <label className="mobile-label">Gjendje Kosove</label>
          <NumericInput
            className="mobile-input"
            min={0}
            value={props.gjendjeKosove}
            onChange={(v) => props.onGjendjeKosoveChange(v === '' ? 0 : Number(v))}
          />
        </div>
        <div>
          <label className="mobile-label">Gjendje Shqiperi</label>
          <NumericInput
            className="mobile-input"
            min={0}
            value={props.gjendjeShqiperi}
            onChange={(v) => props.onGjendjeShqiperiChange(v === '' ? 0 : Number(v))}
          />
        </div>
      </div>
      {props.error ? <div className="mobile-inline-error">{props.error}</div> : null}
    </div>
  )
}

export function ProdukteTab(props: { notify: (message: string, variant?: 'success' | 'default') => void }) {
  const productsQuery = useProductsQuery()
  const qc = useQueryClient()
  const { user } = useAuth()
  const crud = useProductCrud()
  const [search, setSearch] = React.useState('')
  const [detailProduct, setDetailProduct] = React.useState<Produkti | null>(null)
  const [addOpen, setAddOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const [newKodi, setNewKodi] = React.useState('')
  const [newEmri, setNewEmri] = React.useState('')
  const [newGjendjeKosove, setNewGjendjeKosove] = React.useState(0)
  const [newGjendjeShqiperi, setNewGjendjeShqiperi] = React.useState(0)

  const [editDraft, setEditDraft] = React.useState<Produkti | null>(null)

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
    setNewGjendjeKosove(0)
    setNewGjendjeShqiperi(0)
    crud.setProductError(null)
  }

  const submitAdd = () => {
    crud.setProductError(null)
    if (!newKodi.trim() || !newEmri.trim()) {
      crud.setProductError('Kodi dhe Emri jane te detyrueshem.')
      return
    }
    crud.createMut.mutate(
      {
        kodi: newKodi.trim(),
        emri: newEmri.trim(),
        gjendje_kosove: newGjendjeKosove,
        gjendje_shqiperi: newGjendjeShqiperi,
      },
      {
        onSuccess: () => {
          resetAddForm()
          setAddOpen(false)
          props.notify('Produkti u shtua me sukses.', 'success')
          scheduleInvalidate(qc, 'products', { userId: user?.id })
        },
      },
    )
  }

  const openEdit = (p: Produkti) => {
    setEditDraft({ ...p })
    setDetailProduct(null)
    setEditOpen(true)
  }

  const submitEdit = () => {
    if (!editDraft) return
    crud.updateMut.mutate(editDraft, {
      onSuccess: () => {
        setEditOpen(false)
        setEditDraft(null)
        props.notify('Produkti u perditesua me sukses.', 'success')
        scheduleInvalidate(qc, 'products', { userId: user?.id })
      },
    })
  }

  return (
    <>
      <div className="mobile-tab-panel">
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

        {productsQuery.isLoading ? (
          <MobileProductListPending count={5} variant="legacy" />
        ) : products.length === 0 ? (
          <div className="mobile-empty">
            <div className="mobile-empty-title">Nuk ka produkte</div>
            <button type="button" className="mobile-btn-outline" onClick={() => setAddOpen(true)}>
              + Shto produkt
            </button>
          </div>
        ) : (
          <div className="mobile-list-stack mobile-panel-enter">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                className="mobile-row-card"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => setDetailProduct(p)}
              >
                <div className="mobile-row-card-body">
                  <div className="mobile-row-card-title">{productLabel(p.emri, p.kodi)}</div>
                  <MobileStockLevels
                    gjendjeKosove={p.gjendje_kosove}
                    gjendjeShqiperi={p.gjendje_shqiperi}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" className="mobile-fab" aria-label="Shto produkt" onClick={() => setAddOpen(true)}>
        +
      </button>

      <BottomSheet
        open={!!detailProduct}
        title={detailProduct ? productLabel(detailProduct.emri, detailProduct.kodi) : ''}
        onClose={() => setDetailProduct(null)}
        footer={
          detailProduct ? (
            <SheetFooterRow>
              <SheetEditButton label="Ndrysho" onClick={() => openEdit(detailProduct)} />
              <SheetConfirmButton
                label="Fshi"
                variant="danger"
                icon="delete"
                onClick={() => setDeleteOpen(true)}
              />
            </SheetFooterRow>
          ) : undefined
        }
      >
        {detailProduct ? (
          <div className="mobile-list-stack">
            <MobileStockLevels
              gjendjeKosove={detailProduct.gjendje_kosove}
              gjendjeShqiperi={detailProduct.gjendje_shqiperi}
            />
          </div>
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
            confirmLabel={crud.createMut.isPending ? 'Duke ruajtur…' : 'Ruaj'}
            confirmLoading={crud.createMut.isPending}
            onConfirm={submitAdd}
          />
        }
      >
        <ProductFormFields
          kodi={newKodi}
          emri={newEmri}
          gjendjeKosove={newGjendjeKosove}
          gjendjeShqiperi={newGjendjeShqiperi}
          error={crud.productError}
          onKodiChange={setNewKodi}
          onEmriChange={setNewEmri}
          onGjendjeKosoveChange={setNewGjendjeKosove}
          onGjendjeShqiperiChange={setNewGjendjeShqiperi}
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
          <ProductFormFields
            kodi={editDraft.kodi}
            emri={editDraft.emri}
            gjendjeKosove={editDraft.gjendje_kosove}
            gjendjeShqiperi={editDraft.gjendje_shqiperi}
            error={crud.productError}
            onKodiChange={(v) => setEditDraft((d) => d && { ...d, kodi: v })}
            onEmriChange={(v) => setEditDraft((d) => d && { ...d, emri: v })}
            onGjendjeKosoveChange={(v) => setEditDraft((d) => d && { ...d, gjendje_kosove: v })}
            onGjendjeShqiperiChange={(v) => setEditDraft((d) => d && { ...d, gjendje_shqiperi: v })}
          />
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={deleteOpen && !!detailProduct}
        title="Fshij produktin?"
        onClose={() => setDeleteOpen(false)}
        footer={
          <SheetActionFooter
            onCancel={() => setDeleteOpen(false)}
            confirmLabel={crud.deleteMut.isPending ? 'Duke fshire…' : 'Fshij'}
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
    </>
  )
}
