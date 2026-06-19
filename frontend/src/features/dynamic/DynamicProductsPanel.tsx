import * as React from 'react'
import { ErrorAlert } from '../../components/ErrorAlert'
import { exportDynamicProductsUrl, stockRecord, type DynamicProdukti } from '../../lib/api'
import { fmtInt } from '../../lib/format'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { locationBadge } from '../../lib/lokacioni/LokacioniProvider'

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
}) {
  const multiplier = props.sort.direction === 'asc' ? 1 : -1
  const columnWidths = React.useMemo(
    () => computeDynamicProductColumnWidths(props.locations.length),
    [props.locations.length],
  )

  const sortedProducts = React.useMemo(() => {
    const products = [...props.products]
    const key = props.sort.key
    products.sort((a, b) => {
      if (key === 'kodi' || key === 'emri') {
        return (
          String(a[key]).localeCompare(String(b[key]), undefined, {
            sensitivity: 'base',
            numeric: true,
          }) * multiplier
        )
      }
      const stockA = stockRecord(a)[key] ?? 0
      const stockB = stockRecord(b)[key] ?? 0
      return (stockA - stockB) * multiplier
    })
    return products
  }, [props.products, props.sort, multiplier])

  const filteredProducts = React.useMemo(() => {
    const q = props.search.trim().toLowerCase()
    if (!q) return sortedProducts
    return sortedProducts.filter(
      (p) => p.kodi.toLowerCase().includes(q) || p.emri.toLowerCase().includes(q),
    )
  }, [sortedProducts, props.search])

  const sortArrow = (key: DynamicProductSortKey) => {
    if (props.sort.key !== key) return '↕'
    return props.sort.direction === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="card products-card">
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
            <input
              className="products-search"
              type="search"
              value={props.search}
              placeholder="Kerko sipas kodit ose emrit…"
              aria-label="Kerko produktet sipas kodit ose emrit"
              onChange={(e) => props.onSearchChange(e.target.value)}
            />
          </div>
        </div>
        <div className="spacer" />
        <button type="button" className="btn" onClick={props.onAddProduct}>
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

      <div className="table-scroll products-table-wrap">
        <table className="table products-table products-table-dynamic">
          <colgroup>
            <col className="products-col-kodi" />
            <col className="products-col-emri" style={{ width: `${columnWidths.emriPct}%` }} />
            {props.locations.map((loc) => (
              <col
                key={loc.id}
                className="products-col-location"
                style={{ width: `${columnWidths.locationPct}%` }}
              />
            ))}
            <col className="products-col-actions" style={{ width: `${columnWidths.actionsPct}%` }} />
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
                  colSpan={props.locations.length + 3}
                  style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}
                >
                  {props.search.trim()
                    ? 'Nuk u gjet asnje produkt per kete kerkim.'
                    : 'Nuk ka produkte. Shto produktin e pare me butonin me lart.'}
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const stock = stockRecord(p)
                return (
                  <tr key={p.id}>
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
                          className="btn sm"
                          onClick={() => props.onEditProduct(p)}
                          aria-label="Ndrysho produktin"
                          title="Ndrysho"
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
                        <button
                          type="button"
                          className="btn danger sm"
                          onClick={() => props.onDeleteProduct(p)}
                          disabled={props.deletePending}
                          aria-label="Fshij produktin"
                          title="Fshij"
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
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
