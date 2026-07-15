import * as React from 'react'
import { HoverTooltip } from '../../components/HoverTooltip'
import { ErrorAlert } from '../../components/ErrorAlert'
import { DebouncedSearchInput } from '../../components/DebouncedSearchInput'
import { exportDynamicProductsUrl, stockRecord, type DynamicProdukti } from '../../lib/api'
import { fmtInt } from '../../lib/format'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { locationBadge } from '../../lib/lokacioni/LokacioniProvider'
import {
  PRODUCT_TABLE_VIRTUALIZE_THRESHOLD,
  useVirtualizedWindow,
} from '../../hooks/useVirtualizedWindow'

export type DynamicProductSortKey = 'kodi' | 'emri' | string

function computeDynamicProductColumnWidths(locationCount: number) {
  const actionsPct = 8
  const emriPct =
    locationCount >= 6 ? 14 : locationCount >= 4 ? 16 : locationCount >= 2 ? 20 : 26
  const locationPct =
    locationCount > 0 ? (100 - actionsPct - emriPct) / locationCount : 0
  return { emriPct, actionsPct, locationPct }
}

export function DynamicProductsPanel(props: {
  products: DynamicProdukti[]
  locations: Lokacioni[]
  sort: { key: DynamicProductSortKey; direction: 'asc' | 'desc' }
  search: string
  error: string | null
  showAddProduct: boolean
  deletePending: boolean
  onSearchChange: (value: string) => void
  onSortChange: (key: DynamicProductSortKey) => void
  onAddProduct: () => void
  onEditProduct: (product: DynamicProdukti) => void
  onDeleteProduct: (product: DynamicProdukti) => void
  scrollableTable?: boolean
  canAddProduct?: boolean
  canEditProduct?: boolean
  canDeleteProduct?: boolean
}) {
  const multiplier = props.sort.direction === 'asc' ? 1 : -1
  const columnWidths = React.useMemo(
    () => computeDynamicProductColumnWidths(props.locations.length),
    [props.locations.length],
  )

  const sortedProducts = React.useMemo(() => {
    const products = [...props.products]
    const key = props.sort.key
    if (key === 'kodi' || key === 'emri') {
      products.sort(
        (a, b) =>
          String(a[key]).localeCompare(String(b[key]), undefined, {
            sensitivity: 'base',
            numeric: true,
          }) * multiplier,
      )
      return products
    }

    const stockByProductId = new Map(
      products.map((product) => [product.id, stockRecord(product)[key] ?? 0] as const),
    )
    products.sort(
      (a, b) => ((stockByProductId.get(a.id) ?? 0) - (stockByProductId.get(b.id) ?? 0)) * multiplier,
    )
    return products
  }, [props.products, props.sort, multiplier])

  const filteredProducts = React.useMemo(() => {
    const q = props.search.trim().toLowerCase()
    if (!q) return sortedProducts
    return sortedProducts.filter(
      (p) => p.kodi.toLowerCase().includes(q) || p.emri.toLowerCase().includes(q),
    )
  }, [sortedProducts, props.search])

  const virtualize = filteredProducts.length >= PRODUCT_TABLE_VIRTUALIZE_THRESHOLD
  const virtual = useVirtualizedWindow({
    itemCount: filteredProducts.length,
    enabled: virtualize,
  })
  const visibleProducts = filteredProducts.slice(virtual.start, virtual.end)
  const colSpan = props.locations.length + 3

  const sortArrow = (key: DynamicProductSortKey) => {
    if (props.sort.key !== key) return '↕'
    return props.sort.direction === 'asc' ? '↑' : '↓'
  }

  const useFixedColumns = props.scrollableTable ?? false
  const locationColWidth = '4.5rem'

  return (
    <div
      className="card products-card"
      data-scrollable-table={useFixedColumns ? 'true' : undefined}
    >
      <div className="row section-header products-header">
        <h3>Produkte</h3>
        <div className="products-search-wrap">
          <div className="products-search-field">
            <svg
              className="products-search-icon"
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
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <DebouncedSearchInput
              className="products-search"
              value={props.search}
              placeholder="Kerko sipas kodit ose emrit…"
              onChange={props.onSearchChange}
            />
          </div>
        </div>
        <div className="spacer" />
        <button
          type="button"
          className="btn"
          onClick={props.onAddProduct}
          disabled={props.canAddProduct === false}
          data-tutorial="add-product-btn"
        >
          + Shto produkt
        </button>
        <a
          className="btn"
          href={exportDynamicProductsUrl()}
          title="Shkarko Excel"
        >
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Excel
        </a>
      </div>

      {props.error && !props.showAddProduct && (
        <ErrorAlert message={props.error} style={{ marginBottom: 12, padding: '10px 14px', fontSize: 13 }} />
      )}

      <div ref={virtual.scrollRef} className="table-scroll products-table-wrap" data-tutorial="products-table">
        <table className="table products-table products-table-dynamic">
          <colgroup>
            <col className="products-col-kodi" />
            <col
              className="products-col-emri"
              style={
                useFixedColumns
                  ? { width: '7rem' }
                  : { width: `${columnWidths.emriPct}%` }
              }
            />
            {props.locations.map((loc) => (
              <col
                key={loc.id}
                className="products-col-location"
                style={
                  useFixedColumns
                    ? { width: locationColWidth }
                    : { width: `${columnWidths.locationPct}%` }
                }
              />
            ))}
            <col
              className="products-col-actions"
              style={
                useFixedColumns
                  ? { width: '4rem' }
                  : { width: `${columnWidths.actionsPct}%` }
              }
            />
          </colgroup>
          <thead>
            <tr>
              <th
                className="product-kodi-cell"
                aria-sort={
                  props.sort.key === 'kodi'
                    ? props.sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <button type="button" className="sort-header" onClick={() => props.onSortChange('kodi')}>
                  <span>Kodi</span>
                  <span className="sort-arrow" aria-hidden="true">
                    {sortArrow('kodi')}
                  </span>
                </button>
              </th>
              <th
                aria-sort={
                  props.sort.key === 'emri'
                    ? props.sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <button type="button" className="sort-header" onClick={() => props.onSortChange('emri')}>
                  <span>Emri</span>
                  <span className="sort-arrow" aria-hidden="true">
                    {sortArrow('emri')}
                  </span>
                </button>
              </th>
              {props.locations.map((loc) => (
                <th
                  key={loc.id}
                  style={{ textAlign: 'center' }}
                  aria-sort={
                    props.sort.key === loc.id
                      ? props.sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    className="sort-header centered sort-header-location"
                    title={loc.emri}
                    aria-label={`Rendit sipas gjendjes ne ${loc.emri}`}
                    onClick={() => props.onSortChange(loc.id)}
                  >
                    <span className="sort-header-location-top">
                      <span className="sort-header-location-badge" aria-hidden="true">
                        {locationBadge(loc)}
                      </span>
                      <span className="sort-arrow" aria-hidden="true">
                        {sortArrow(loc.id)}
                      </span>
                    </span>
                    <span className="sort-header-location-label" title={loc.emri}>
                      {loc.emri}
                    </span>
                  </button>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}
                >
                  {props.search.trim()
                    ? 'Nuk u gjet asnje produkt per kete kerkim.'
                    : 'Nuk ka produkte. Shto produktin e pare me butonin me lart.'}
                </td>
              </tr>
            ) : (
              <>
                {virtualize && virtual.topSpacer > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={colSpan} style={{ height: virtual.topSpacer, padding: 0, border: 0 }} />
                  </tr>
                ) : null}
                {visibleProducts.map((p) => {
                const stock = stockRecord(p)
                return (
                  <tr key={p.id} style={virtualize ? { height: virtual.rowHeight } : undefined}>
                    <td className="product-text-cell product-kodi-cell">
                      <code className="product-text" data-full={p.kodi} title={p.kodi}>
                        {p.kodi}
                      </code>
                    </td>
                    <td className="product-name-cell product-text-cell">
                      <span className="product-text" data-full={p.emri} title={p.emri}>
                        {p.emri}
                      </span>
                    </td>
                    {props.locations.map((loc) => (
                      <td key={loc.id} style={{ textAlign: 'center' }}>
                        <span className="stock-badge" title={loc.emri}>
                          {fmtInt(stock[loc.id] ?? 0)}
                        </span>
                      </td>
                    ))}
                    <td style={{ textAlign: 'right' }}>
                      <div className="product-actions">
                        <button
                          type="button"
                          className="btn sm hover-tooltip"
                          data-tooltip="Bej ndryshime"
                          onClick={() => props.onEditProduct(p)}
                          disabled={props.canEditProduct === false}
                          aria-label="Ndrysho produktin"
                        >
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
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <HoverTooltip label="Fshi">
                          <button
                            type="button"
                            className="btn danger sm"
                            onClick={() => props.onDeleteProduct(p)}
                            disabled={props.deletePending || props.canDeleteProduct === false}
                            aria-label="Fshi produktin"
                          >
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
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </button>
                        </HoverTooltip>
                      </div>
                    </td>
                  </tr>
                )
              })}
                {virtualize && virtual.bottomSpacer > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={colSpan} style={{ height: virtual.bottomSpacer, padding: 0, border: 0 }} />
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
