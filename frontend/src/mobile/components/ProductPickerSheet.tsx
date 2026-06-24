import * as React from 'react'
import { CheckIcon } from '../../components/icons'
import { InputClearButton } from '../../components/InputClearButton'
import { productLabel, sortProductsByKodi } from '../../lib/format'
import type { Produkti } from '../../lib/api'
import type { ActionItemDraft } from '../../types/actionItem'
import { NumericInput } from '../../components/NumericInput'
import { useOverscrollLock } from '../../hooks/useOverscrollLock'
import { BottomSheet } from './BottomSheet'
import { SheetActionFooter } from './SheetActions'

const FORM_ID = 'mobile-product-picker-form'

export type ProductPickerSaveData = Pick<
  ActionItemDraft,
  'kodi_produktit' | 'cmimi_njesi' | 'sasia' | 'shenim'
>

function ProductPickerForm(props: {
  products: Produkti[]
  showPrice?: boolean
  initial?: Pick<ActionItemDraft, 'kodi_produktit' | 'cmimi_njesi' | 'sasia' | 'shenim'>
  onSave: (data: ProductPickerSaveData) => void
  onClose: () => void
}) {
  const showPrice = props.showPrice ?? true
  const [search, setSearch] = React.useState('')
  const [kodi, setKodi] = React.useState(props.initial?.kodi_produktit ?? '')
  const [price, setPrice] = React.useState(props.initial?.cmimi_njesi ?? '')
  const [qty, setQty] = React.useState(props.initial?.sasia ?? '')
  const [shenim, setShenim] = React.useState(props.initial?.shenim ?? '')
  const [error, setError] = React.useState<string | null>(null)
  const itemRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map())
  const listRef = React.useRef<HTMLDivElement>(null)

  useOverscrollLock(listRef)

  const sorted = React.useMemo(() => sortProductsByKodi(props.products), [props.products])
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(
      (p) => p.kodi.toLowerCase().includes(q) || p.emri.toLowerCase().includes(q),
    )
  }, [sorted, search])

  const selectedProduct = React.useMemo(
    () => sorted.find((p) => p.kodi === kodi) ?? null,
    [sorted, kodi],
  )

  const selectProduct = (product: Produkti) => {
    setKodi(product.kodi)
    setError(null)
    requestAnimationFrame(() => {
      itemRefs.current.get(product.kodi)?.scrollIntoView({ block: 'nearest' })
    })
  }

  const save = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!kodi) {
      setError('Zgjidh produktin.')
      return
    }
    if (Number(qty) <= 0) {
      setError('Sasia duhet te jete > 0.')
      return
    }
    if (showPrice && Number(price) < 0) {
      setError('Cmimi/Njesi duhet te jete >= 0.')
      return
    }
    props.onSave({
      kodi_produktit: kodi,
      cmimi_njesi: showPrice ? price : '0',
      sasia: qty,
      shenim: shenim.trim(),
    })
    props.onClose()
  }

  return (
    <form id={FORM_ID} className="mobile-picker-form" onSubmit={save}>
      <input
        className="mobile-search-input"
        placeholder="Kërko produkt..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div
        className={`mobile-picker-empty${selectedProduct ? ' mobile-picker-empty--selected' : ''}`}
        aria-live="polite"
      >
        <span className="mobile-picker-empty-text">
          {selectedProduct
            ? productLabel(selectedProduct.emri, selectedProduct.kodi)
            : 'Zgjidh nje produkt nga lista'}
        </span>
        {selectedProduct ? (
          <span className="mobile-picker-empty-check" aria-hidden="true">
            <CheckIcon />
          </span>
        ) : null}
      </div>

      <div
        ref={listRef}
        className={`mobile-picker-list${filtered.length > 4 ? ' mobile-picker-list--scrollable' : ''}`}
      >
        {filtered.length === 0 ? (
          <div className="mobile-picker-empty">Nuk u gjet produkt.</div>
        ) : (
          filtered.map((p) => {
            const selected = kodi === p.kodi
            return (
              <button
                key={p.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(p.kodi, el)
                  else itemRefs.current.delete(p.kodi)
                }}
                type="button"
                className={`mobile-picker-item${selected ? ' selected' : ''}`}
                onClick={() => selectProduct(p)}
              >
                <span className="mobile-picker-item-label">{productLabel(p.emri, p.kodi)}</span>
                {selected ? (
                  <span className="mobile-picker-item-check" aria-hidden="true">
                    <CheckIcon />
                  </span>
                ) : null}
              </button>
            )
          })
        )}
      </div>

      <div className="mobile-picker-fields">
        <div className={`mobile-field-row${showPrice ? '' : ' mobile-field-row-single'}`}>
          {showPrice ? (
            <div>
              <label className="mobile-label">Cmimi/Njesi</label>
              <NumericInput
                className="mobile-input"
                step="0.01"
                min={0}
                clearable
                value={price}
                onChange={setPrice}
                placeholder="0.00"
              />
            </div>
          ) : null}
          <div>
            <label className="mobile-label">Sasia</label>
            <NumericInput
              className="mobile-input"
              min={1}
              value={qty}
              onChange={setQty}
              placeholder="1"
            />
          </div>
        </div>
        <div>
          <label className="mobile-label" htmlFor="mobile-picker-shenim">
            Shënim
          </label>
          <span
            className={`clearable-field${shenim.trim() ? ' clearable-field--has-value' : ''}`}
          >
            <input
              id="mobile-picker-shenim"
              type="text"
              className="mobile-input clearable-field__control"
              value={shenim}
              onChange={(e) => setShenim(e.target.value)}
              maxLength={200}
              placeholder="Opsionale"
            />
            <InputClearButton
              className="clearable-field__clear"
              onClick={() => setShenim('')}
            />
          </span>
        </div>
        {error ? <div className="mobile-inline-error">{error}</div> : null}
      </div>
    </form>
  )
}

export function ProductPickerSheet(props: {
  open: boolean
  title: string
  products: Produkti[]
  showPrice?: boolean
  initial?: Pick<ActionItemDraft, 'kodi_produktit' | 'cmimi_njesi' | 'sasia' | 'shenim'>
  onClose: () => void
  onSave: (data: ProductPickerSaveData) => void
}) {
  const formKey = `${props.initial?.kodi_produktit ?? 'new'}-${props.open}`
  const isEdit = !!props.initial?.kodi_produktit

  return (
    <BottomSheet
      open={props.open}
      title={props.title}
      onClose={props.onClose}
      footer={
        <SheetActionFooter
          onCancel={props.onClose}
          confirmLabel={isEdit ? 'Ruaj' : 'Shto'}
          confirmIcon={isEdit ? 'check' : 'plus'}
          confirmType="submit"
          form={FORM_ID}
        />
      }
    >
      {props.open ? (
        <ProductPickerForm
          key={formKey}
          products={props.products}
          showPrice={props.showPrice}
          initial={props.initial}
          onSave={props.onSave}
          onClose={props.onClose}
        />
      ) : null}
    </BottomSheet>
  )
}
