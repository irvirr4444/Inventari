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
import { MobileSheetStack } from '../components/MobileSheetStack'
import { SheetActionFooter, SheetEditButton, SheetFooterRow, SheetConfirmButton } from '../components/SheetActions'
import { MobileProductListPending } from '../components/MobileProductListPending'
import { MobileStockLevels } from '../components/MobileStockLevels'
import { useFloatingScreenStack } from '../hooks/useScreenStack'

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

type ProductScreen =
  | { type: 'detail'; product: Produkti }
  | { type: 'add' }
  | { type: 'edit'; product: Produkti }
  | { type: 'delete'; product: Produkti }

export function ProdukteTab(props: { notify: (message: string, variant?: 'success' | 'default') => void }) {
  const productsQuery = useProductsQuery()
  const qc = useQueryClient()
  const { user } = useAuth()
  const crud = useProductCrud()
  const sheet = useFloatingScreenStack<ProductScreen>()
  const [search, setSearch] = React.useState('')

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

  const openAdd = () => {
    resetAddForm()
    sheet.push({ type: 'add' })
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
          sheet.close()
          props.notify('Produkti u shtua me sukses.', 'success')
          scheduleInvalidate(qc, 'products', { userId: user?.id })
        },
      },
    )
  }

  const openEdit = (p: Produkti) => {
    setEditDraft({ ...p })
    sheet.push({ type: 'edit', product: p })
  }

  const submitEdit = () => {
    if (!editDraft) return
    crud.updateMut.mutate(editDraft, {
      onSuccess: () => {
        setEditDraft(null)
        sheet.close()
        props.notify('Produkti u perditesua me sukses.', 'success')
        scheduleInvalidate(qc, 'products', { userId: user?.id })
      },
    })
  }

  const current = sheet.current
  let sheetTitle: React.ReactNode = ''
  let sheetFooter: React.ReactNode

  if (current?.type === 'detail') {
    sheetTitle = productLabel(current.product.emri, current.product.kodi)
    sheetFooter = (
      <SheetFooterRow>
        <SheetEditButton label="Ndrysho" onClick={() => openEdit(current.product)} />
        <SheetConfirmButton
          label="Fshi"
          variant="danger"
          icon="delete"
          onClick={() => sheet.push({ type: 'delete', product: current.product })}
        />
      </SheetFooterRow>
    )
  } else if (current?.type === 'add') {
    sheetTitle = 'Shto produkt'
    sheetFooter = (
      <SheetActionFooter
        onCancel={sheet.close}
        confirmLabel={crud.createMut.isPending ? 'Duke ruajtur…' : 'Ruaj'}
        confirmLoading={crud.createMut.isPending}
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

  const renderScreen = (screen: ProductScreen) => {
    switch (screen.type) {
      case 'detail':
        return (
          <div className="mobile-list-stack">
            <MobileStockLevels
              gjendjeKosove={screen.product.gjendje_kosove}
              gjendjeShqiperi={screen.product.gjendje_shqiperi}
            />
          </div>
        )
      case 'add':
        return (
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
        )
      case 'edit':
        return editDraft ? (
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
            <button type="button" className="mobile-btn-outline" onClick={openAdd}>
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
                onClick={() => sheet.push({ type: 'detail', product: p })}
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

      <button type="button" className="mobile-fab" aria-label="Shto produkt" onClick={openAdd}>
        +
      </button>

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
    </>
  )
}
