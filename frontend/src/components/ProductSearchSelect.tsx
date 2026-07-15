import * as React from 'react'
import { createPortal } from 'react-dom'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import type { ProductListItem } from '../lib/api'
import { productLabel, sortProductsByKodi } from '../lib/format'
import { filterProductsByQuery } from '../lib/products'

type ListPosition = {
  top: number
  left: number
  width: number
}

const LIST_MAX_HEIGHT = 280

function computeListPosition(trigger: HTMLElement): ListPosition {
  const rect = trigger.getBoundingClientRect()
  const width = rect.width
  let left = rect.left
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8))

  const gap = 4
  const spaceBelow = window.innerHeight - rect.bottom - gap
  const spaceAbove = rect.top - gap
  let top = rect.bottom + gap
  if (spaceBelow < LIST_MAX_HEIGHT && spaceAbove > spaceBelow) {
    top = Math.max(8, rect.top - gap - LIST_MAX_HEIGHT)
  }

  return { top, left, width }
}

export function ProductSearchSelect(props: {
  products: ProductListItem[]
  value: string
  onChange: (kodi: string) => void
  disabledKodis?: string[]
  placeholder?: string
  id?: string
  disabled?: boolean
  clearable?: boolean
  clearLabel?: string
  'aria-label'?: string
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const selectedOptionRef = React.useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [listPos, setListPos] = React.useState<ListPosition | null>(null)
  const [activeIndex, setActiveIndex] = React.useState(0)

  const disabledKodis = React.useMemo(() => new Set(props.disabledKodis ?? []), [props.disabledKodis])

  const sortedProducts = React.useMemo(
    () => sortProductsByKodi(props.products),
    [props.products],
  )

  const selectedProduct = React.useMemo(
    () => sortedProducts.find((p) => p.kodi === props.value) ?? null,
    [sortedProducts, props.value],
  )

  const filteredProducts = React.useMemo(
    () => filterProductsByQuery(sortedProducts, query),
    [sortedProducts, query],
  )

  const selectableProducts = React.useMemo(
    () => filteredProducts.filter((p) => !disabledKodis.has(p.kodi)),
    [filteredProducts, disabledKodis],
  )

  const selectableIndexByKodi = React.useMemo(() => {
    const map = new Map<string, number>()
    selectableProducts.forEach((product, index) => {
      map.set(product.kodi, index)
    })
    return map
  }, [selectableProducts])

  const isFiltering = query.trim().length > 0
  const MAX_VISIBLE_OPTIONS = 150
  const visibleProducts = isFiltering
    ? filteredProducts
    : filteredProducts.slice(0, MAX_VISIBLE_OPTIONS)
  const hiddenCount = Math.max(0, filteredProducts.length - visibleProducts.length)

  const repositionList = React.useCallback(() => {
    const trigger = inputRef.current
    if (!trigger) return
    setListPos(computeListPosition(trigger))
  }, [])

  const closeMenu = React.useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])

  useEscapeToClose(closeMenu, { enabled: open })

  const openMenu = React.useCallback(() => {
    if (props.disabled) return
    const trigger = inputRef.current
    if (trigger) {
      setListPos(computeListPosition(trigger))
    }
    setOpen(true)
    setQuery('')
    setActiveIndex(0)
  }, [props.disabled])

  const toggleMenu = React.useCallback(() => {
    if (props.disabled) return
    if (open) {
      closeMenu()
      return
    }
    openMenu()
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [closeMenu, openMenu, open, props.disabled])

  const selectProduct = React.useCallback(
    (kodi: string) => {
      if (kodi && disabledKodis.has(kodi)) return
      props.onChange(kodi)
      closeMenu()
    },
    [closeMenu, disabledKodis, props],
  )

  const clearSelection = React.useCallback(() => {
    props.onChange('')
    closeMenu()
  }, [closeMenu, props])

  React.useLayoutEffect(() => {
    if (!open) return
    repositionList()
    const raf = requestAnimationFrame(repositionList)
    return () => cancelAnimationFrame(raf)
  }, [open, query, repositionList])

  React.useLayoutEffect(() => {
    if (!open || isFiltering || !props.value) return
    selectedOptionRef.current?.scrollIntoView({ block: 'nearest' })
  }, [open, isFiltering, props.value, filteredProducts.length])

  React.useEffect(() => {
    if (!open) return

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      closeMenu()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, selectableProducts.length - 1)))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' && selectableProducts.length > 0) {
        e.preventDefault()
        const product = selectableProducts[activeIndex] ?? selectableProducts[0]
        if (product) selectProduct(product.kodi)
      }
    }
    const onReposition = () => repositionList()

    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, activeIndex, selectableProducts, closeMenu, repositionList, selectProduct])

  const inputValue = open
    ? query
    : selectedProduct
      ? productLabel(selectedProduct.emri, selectedProduct.kodi)
      : ''
  const showClearToggle = Boolean(props.clearable && props.value && !props.disabled)

  const list =
    open && listPos ? (
      <div
        ref={listRef}
        className="product-search-list product-search-list-portal"
        role="listbox"
        aria-label={props['aria-label'] ?? 'Lista e produkteve'}
        style={{
          top: listPos.top,
          left: listPos.left,
          width: listPos.width,
        }}
      >
        {props.clearable ? (
          <button
            type="button"
            role="option"
            aria-selected={!props.value}
            className={[
              'product-search-option',
              'product-search-option-clear',
              !props.value && 'selected',
            ]
              .filter(Boolean)
              .join(' ')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => selectProduct('')}
          >
            {props.clearLabel ?? 'Të gjitha produktet'}
          </button>
        ) : null}

        <div className="product-search-list-header">
          {isFiltering ? (
              <span className="product-search-list-meta">
                {filteredProducts.length} rezultat{filteredProducts.length === 1 ? '' : 'e'}
              </span>
          ) : (
            <span className="product-search-list-meta">
              {sortedProducts.length} produkte — kerko ose zgjedh nga lista
            </span>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="product-search-empty">Nuk u gjet produkt.</div>
        ) : (
          <div className="product-search-options">
            {visibleProducts.map((p) => {
              const disabled = disabledKodis.has(p.kodi)
              const selectableIndex = selectableIndexByKodi.get(p.kodi) ?? -1
              const active = !disabled && selectableIndex === activeIndex
              const isSelected = props.value === p.kodi
              return (
                <button
                  key={p.id}
                  ref={isSelected ? selectedOptionRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={[
                    'product-search-option',
                    active && 'active',
                    disabled && 'disabled',
                    isSelected && 'selected',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={disabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectProduct(p.kodi)}
                >
                  {productLabel(p.emri, p.kodi)}
                </button>
              )
            })}
            {hiddenCount > 0 ? (
              <div className="product-search-empty">
                +{hiddenCount} te tjera — shkruaj per te filtruar
              </div>
            ) : null}
          </div>
        )}
      </div>
    ) : null

  return (
    <div
      ref={rootRef}
      className={[
        'product-search-select',
        open && 'open',
        props.clearable && 'product-search-select--clearable',
        props.clearable && props.value && 'product-search-select--has-value',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        ref={inputRef}
        id={props.id}
        className="input product-search-input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label={props['aria-label'] ?? 'Zgjedh produktin'}
        placeholder={props.placeholder ?? 'Kerko sipas kodit ose emrit…'}
        disabled={props.disabled}
        value={inputValue}
        onFocus={() => {
          if (!props.disabled) openMenu()
        }}
        onChange={(e) => {
          if (props.disabled) return
          setQuery(e.target.value)
          setActiveIndex(0)
          if (!open) {
            const trigger = inputRef.current
            if (trigger) setListPos(computeListPosition(trigger))
          }
          setOpen(true)
        }}
      />
      <button
        type="button"
        className="product-search-toggle"
        aria-label={
          showClearToggle
            ? 'Pastro produktin'
            : open
              ? 'Mbyll listen e produkteve'
              : 'Shfaq të gjitha produktet'
        }
        aria-expanded={open}
        disabled={props.disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={showClearToggle ? clearSelection : toggleMenu}
      >
        {showClearToggle ? (
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>

      {list && typeof document !== 'undefined' ? createPortal(list, document.body) : null}
    </div>
  )
}
