import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CountrySelector, useCountry } from '../lib/country'
import {
  analyticsSummary,
  createActionBatch,
  createProduct,
  deleteProduct,
  exportProductsUrl,
  exportUrl,
  listProducts,
  updateProduct,
  type Produkti,
} from '../lib/api'
import type { Country } from '../lib/country'

type ActionItem = {
  key: string
  kodi_produktit: string
  cmimi_njesi: string
  sasia: number
}

type SummaryData = {
  in_qty: number
  in_value: number
  out_qty: number
  out_value: number
}

type ProductSortKey = 'kodi' | 'emri' | 'gjendje_kosove' | 'gjendje_shqiperi'
type SortDirection = 'asc' | 'desc'

function todayISODate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoDateDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDisplayDate(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return isoDate
  return `${match[3]}/${match[2]}/${match[1]}`
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-US')
}

function countryLabel(country: Country) {
  return country === 'XK' ? 'Kosove' : 'Shqiperi'
}

export function DashboardPage() {
  const { country } = useCountry()
  const qc = useQueryClient()

  // ─────────────────────────────────────────────────────────────
  // ACTION ENTRY STATE
  // ─────────────────────────────────────────────────────────────
  const [lloji, setLloji] = React.useState<'Hyrje' | 'Dalje'>('Hyrje')
  const [transferDialogOpen, setTransferDialogOpen] = React.useState(false)
  const [transferFrom, setTransferFrom] = React.useState<Country>('XK')
  const [transferTo, setTransferTo] = React.useState<Country>('AL')
  const [transferDate, setTransferDate] = React.useState(todayISODate())
  const [transferItems, setTransferItems] = React.useState<ActionItem[]>([
    { key: crypto.randomUUID(), kodi_produktit: '', cmimi_njesi: '', sasia: 1 },
  ])
  const [transferError, setTransferError] = React.useState<string | null>(null)
  const [confirmTransferOpen, setConfirmTransferOpen] = React.useState(false)
  const [actionDate, setActionDate] = React.useState(todayISODate())
  const [actionItems, setActionItems] = React.useState<ActionItem[]>([
    { key: crypto.randomUUID(), kodi_produktit: '', cmimi_njesi: '', sasia: 1 },
  ])
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [confirmActionOpen, setConfirmActionOpen] = React.useState(false)
  const [snackbar, setSnackbar] = React.useState<string | null>(null)

  // ─────────────────────────────────────────────────────────────
  // PRODUCTS STATE
  // ─────────────────────────────────────────────────────────────
  const [showAddProduct, setShowAddProduct] = React.useState(false)
  const [newKodi, setNewKodi] = React.useState('')
  const [newEmri, setNewEmri] = React.useState('')
  const [newGjendjeKosove, setNewGjendjeKosove] = React.useState(0)
  const [newGjendjeShqiperi, setNewGjendjeShqiperi] = React.useState(0)
  const [editing, setEditing] = React.useState<Produkti | null>(null)
  const [deletingProduct, setDeletingProduct] = React.useState<Produkti | null>(null)
  const [productError, setProductError] = React.useState<string | null>(null)
  const [productSort, setProductSort] = React.useState<{ key: ProductSortKey; direction: SortDirection }>({
    key: 'kodi',
    direction: 'asc',
  })

  // ─────────────────────────────────────────────────────────────
  // ANALYTICS STATE
  // ─────────────────────────────────────────────────────────────
  const [from, setFrom] = React.useState(() => isoDateDaysAgo(30))
  const [to, setTo] = React.useState(() => isoDateDaysAgo(0))

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => listProducts({}),
    placeholderData: [],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const summaryKosoveQuery = useQuery({
    queryKey: ['analytics-summary', 'XK', from, to],
    queryFn: () => analyticsSummary({ shteti: 'XK', from, to }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const summaryShqiperiQuery = useQuery({
    queryKey: ['analytics-summary', 'AL', from, to],
    queryFn: () => analyticsSummary({ shteti: 'AL', from, to }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const sortedProducts = React.useMemo(() => {
    const products = [...(productsQuery.data ?? [])]
    const multiplier = productSort.direction === 'asc' ? 1 : -1

    products.sort((a, b) => {
      const aValue = a[productSort.key]
      const bValue = b[productSort.key]

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * multiplier
      }

      return String(aValue).localeCompare(String(bValue), undefined, {
        sensitivity: 'base',
        numeric: true,
      }) * multiplier
    })

    return products
  }, [productSort, productsQuery.data])

  // ─────────────────────────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────────────────────────
  const actionMutation = useMutation({
    mutationFn: () =>
      createActionBatch({
        shteti: country,
        lloji,
        data: actionDate,
        items: actionItems
          .filter((i) => i.kodi_produktit.trim())
          .map((i) => ({
            kodi_produktit: i.kodi_produktit.trim(),
            cmimi_njesi: Number(i.cmimi_njesi) || 0,
            sasia: Number(i.sasia) || 0,
          })),
      }),
    onSuccess: async (result) => {
      setActionError(null)
      setConfirmActionOpen(false)
      setSnackbar(
        result.meta?.mirrored_to_albania
          ? `U regjistrua Dalje ne Kosove dhe Hyrje ne Shqiperi per ${result.meta.mirrored_count ?? 0} produkte.`
          : 'Veprimi u regjistrua me sukses.',
      )
      setActionItems([{ key: crypto.randomUUID(), kodi_produktit: '', cmimi_njesi: '', sasia: 1 }])
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['products'] }),
        qc.invalidateQueries({ queryKey: ['analytics-summary'] }),
        qc.refetchQueries({ queryKey: ['analytics-summary'], type: 'active' }),
      ])
    },
    onError: (e) => {
      setActionError(e instanceof Error ? e.message : 'Error')
      setConfirmActionOpen(false)
    },
  })

  const transferMutation = useMutation({
    mutationFn: () =>
      createActionBatch({
        shteti: transferFrom,
        destination_shteti: transferTo,
        lloji: 'Transfer',
        data: transferDate,
        items: transferItems
          .filter((i) => i.kodi_produktit.trim())
          .map((i) => ({
            kodi_produktit: i.kodi_produktit.trim(),
            cmimi_njesi: Number(i.cmimi_njesi) || 0,
            sasia: Number(i.sasia) || 0,
          })),
      }),
    onSuccess: async (result) => {
      setTransferError(null)
      setConfirmTransferOpen(false)
      setTransferDialogOpen(false)
      setSnackbar(
        result.meta?.transfer
          ? `Transfer nga ${countryLabel(result.meta.transfer_from ?? transferFrom)} ne ${countryLabel(result.meta.transfer_to ?? transferTo)} u regjistrua per ${result.meta.transfer_count ?? 0} produkte.`
          : `Transfer nga ${countryLabel(transferFrom)} ne ${countryLabel(transferTo)} u regjistrua me sukses.`,
      )
      setTransferItems([{ key: crypto.randomUUID(), kodi_produktit: '', cmimi_njesi: '', sasia: 1 }])
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['products'] }),
        qc.invalidateQueries({ queryKey: ['analytics-summary'] }),
        qc.refetchQueries({ queryKey: ['analytics-summary'], type: 'active' }),
      ])
    },
    onError: (e) => {
      setTransferError(e instanceof Error ? e.message : 'Error')
      setConfirmTransferOpen(false)
    },
  })

  React.useEffect(() => {
    if (!snackbar) return
    const timer = window.setTimeout(() => setSnackbar(null), 4500)
    return () => window.clearTimeout(timer)
  }, [snackbar])

  const createProductMut = useMutation({
    mutationFn: () =>
      createProduct({
        kodi: newKodi.trim(),
        emri: newEmri.trim(),
        gjendje_kosove: Number(newGjendjeKosove) || 0,
        gjendje_shqiperi: Number(newGjendjeShqiperi) || 0,
      }),
    onSuccess: async () => {
      setProductError(null)
      setNewKodi('')
      setNewEmri('')
      setNewGjendjeKosove(0)
      setNewGjendjeShqiperi(0)
      setShowAddProduct(false)
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => setProductError(e instanceof Error ? e.message : 'Error'),
  })

  const updateProductMut = useMutation({
    mutationFn: (p: Produkti) =>
      updateProduct(p.id, {
        kodi: p.kodi.trim(),
        emri: p.emri.trim(),
        gjendje_kosove: p.gjendje_kosove,
        gjendje_shqiperi: p.gjendje_shqiperi,
      }),
    onSuccess: async () => {
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => setProductError(e instanceof Error ? e.message : 'Error'),
  })

  const deleteProductMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async () => {
      setProductError(null)
      setDeletingProduct(null)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['products'] }),
        qc.invalidateQueries({ queryKey: ['analytics-summary'] }),
      ])
    },
    onError: (e) => setProductError(e instanceof Error ? e.message : 'Error'),
  })

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────
  const submitAction = (e: React.FormEvent) => {
    e.preventDefault()
    setActionError(null)
    const clean = actionItems.filter((i) => i.kodi_produktit.trim())
    if (clean.length === 0) {
      setActionError('Shto te pakten nje produkt.')
      return
    }
    for (const it of clean) {
      if (Number(it.sasia) <= 0) {
        setActionError('Sasia duhet te jete > 0.')
        return
      }
      if (Number(it.cmimi_njesi) < 0) {
        setActionError('Cmimi/Njesi duhet te jete >= 0.')
        return
      }
    }
    setConfirmActionOpen(true)
  }

  const openTransferDialog = () => {
    setTransferFrom(country)
    setTransferTo(country === 'XK' ? 'AL' : 'XK')
    setTransferDate(todayISODate())
    setTransferItems([{ key: crypto.randomUUID(), kodi_produktit: '', cmimi_njesi: '', sasia: 1 }])
    setTransferError(null)
    setConfirmTransferOpen(false)
    setTransferDialogOpen(true)
  }

  const submitTransfer = (e: React.FormEvent) => {
    e.preventDefault()
    setTransferError(null)
    const clean = transferItems.filter((i) => i.kodi_produktit.trim())
    if (clean.length === 0) {
      setTransferError('Shto te pakten nje produkt.')
      return
    }
    for (const it of clean) {
      if (Number(it.sasia) <= 0) {
        setTransferError('Sasia duhet te jete > 0.')
        return
      }
      if (Number(it.cmimi_njesi) < 0) {
        setTransferError('Cmimi/Njesi duhet te jete >= 0.')
        return
      }
    }
    if (transferFrom === transferTo) {
      setTransferError('Transferi kerkon dy vende te ndryshme.')
      return
    }
    setConfirmTransferOpen(true)
  }

  const submitNewProduct = (e: React.FormEvent) => {
    e.preventDefault()
    setProductError(null)
    if (!newKodi.trim() || !newEmri.trim()) {
      setProductError('Kodi dhe Emri jane te detyrueshem.')
      return
    }
    createProductMut.mutate()
  }

  const addActionItem = () => {
    setActionItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), kodi_produktit: '', cmimi_njesi: '', sasia: 1 },
    ])
  }

  const removeActionItem = (key: string) => {
    setActionItems((prev) => prev.filter((x) => x.key !== key))
  }

  const updateActionItem = (key: string, field: keyof ActionItem, value: string | number) => {
    if (
      field === 'kodi_produktit' &&
      typeof value === 'string' &&
      value &&
      actionItems.some((x) => x.key !== key && x.kodi_produktit === value)
    ) {
      setSnackbar('Ky produkt eshte tashme ne liste')
      return
    }

    setActionItems((prev) =>
      prev.map((x) => (x.key === key ? { ...x, [field]: value } : x))
    )
  }

  const addTransferItem = () => {
    setTransferItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), kodi_produktit: '', cmimi_njesi: '', sasia: 1 },
    ])
  }

  const removeTransferItem = (key: string) => {
    setTransferItems((prev) => prev.filter((x) => x.key !== key))
  }

  const updateTransferItem = (key: string, field: keyof ActionItem, value: string | number) => {
    if (
      field === 'kodi_produktit' &&
      typeof value === 'string' &&
      value &&
      transferItems.some((x) => x.key !== key && x.kodi_produktit === value)
    ) {
      setSnackbar('Ky produkt eshte tashme ne liste')
      return
    }

    setTransferItems((prev) =>
      prev.map((x) => (x.key === key ? { ...x, [field]: value } : x)),
    )
  }

  const changeProductSort = (key: ProductSortKey) => {
    setProductSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const productSortArrow = (key: ProductSortKey) => {
    if (productSort.key !== key) return '↕'
    return productSort.direction === 'asc' ? '↑' : '↓'
  }

  const actionTotal = actionItems.reduce(
    (sum, it) => sum + (Number(it.cmimi_njesi) || 0) * (Number(it.sasia) || 0),
    0,
  )
  const transferTotal = transferItems.reduce(
    (sum, it) => sum + (Number(it.cmimi_njesi) || 0) * (Number(it.sasia) || 0),
    0,
  )
  const emptySummary: SummaryData = { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 }
  const summaryKosove = summaryKosoveQuery.data ?? emptySummary
  const summaryShqiperi = summaryShqiperiQuery.data ?? emptySummary
  const summaryIsFetching = summaryKosoveQuery.isFetching || summaryShqiperiQuery.isFetching
  const summaryError = summaryKosoveQuery.error ?? summaryShqiperiQuery.error

  return (
    <div className="dashboard-stack">
      {/* ═══════════════════════════════════════════════════════════════
          ACTION ENTRY (TOP)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="card action-card">
        <div className="row action-header">
          <h2>Regjistro Veprim</h2>
          <button
            type="button"
            className="btn sm transfer-mode-btn"
            onClick={openTransferDialog}
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
              <path d="M7 7h11l-3-3" />
              <path d="M18 7l-3 3" />
              <path d="M17 17H6l3 3" />
              <path d="M6 17l3-3" />
            </svg>
            Transfero
          </button>
          <div className="spacer" />
          <div className="row action-controls">
            <div className="row" style={{ gap: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>Shteti</span>
              <CountrySelector />
            </div>
            <div className="row action-date-control" style={{ gap: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>Data e Veprimit</span>
              <DateInput value={actionDate} onChange={setActionDate} style={{ width: 150 }} />
            </div>
          </div>
        </div>

        <form onSubmit={submitAction}>
          <div className="toggle-group" style={{ marginBottom: 20 }}>
            <button
              type="button"
              className={`toggle-btn ${lloji === 'Hyrje' ? 'active success' : ''}`}
              onClick={() => setLloji('Hyrje')}
            >
              Hyrje (IN)
            </button>
            <button
              type="button"
              className={`toggle-btn ${lloji === 'Dalje' ? 'active danger' : ''}`}
              onClick={() => setLloji('Dalje')}
            >
              Dalje (OUT)
            </button>
          </div>

          <ActionItemsTable
            items={actionItems}
            products={productsQuery.data ?? []}
            onUpdate={updateActionItem}
            onRemove={removeActionItem}
          />

          {/* Footer */}
          <div className="row action-footer">
            <button type="button" className="btn" onClick={addActionItem}>
              + Shto produkt
            </button>
            <div className="spacer" />
            <div className="row action-total" style={{ gap: 8 }}>
              <span className="muted">Total:</span>
              <span className="num-lg">{fmt(actionTotal)}</span>
            </div>
            <button
              type="submit"
              className="btn primary action-submit"
              disabled={actionMutation.isPending}
              style={{ marginLeft: 16 }}
            >
              {actionMutation.isPending ? 'Duke finalizuar…' : 'Finalizo Veprimin'}
            </button>
          </div>

          {actionError && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                background: 'var(--danger-bg)',
                borderRadius: 8,
                color: 'var(--danger)',
                fontSize: 14,
              }}
            >
              {actionError}
            </div>
          )}
        </form>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BOTTOM ROW: PRODUCTS (left) + SUMMARY (right)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="dashboard-grid">
        {/* PRODUCTS */}
        <div className="card products-card">
          <div className="row section-header products-header">
            <h3>Produkte</h3>
            <div className="spacer" />
            <button type="button" className="btn" onClick={() => setShowAddProduct(true)}>
              + Shto produkt
            </button>
            <a
              className="btn"
              href={exportProductsUrl({
                sortKey: productSort.key,
                sortDirection: productSort.direction,
              })}
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

          {productError && !showAddProduct && (
            <div
              style={{
                marginBottom: 12,
                padding: '10px 14px',
                background: 'var(--danger-bg)',
                borderRadius: 8,
                color: 'var(--danger)',
                fontSize: 13,
              }}
            >
              {productError}
            </div>
          )}

          {/* Products Table */}
          <div className="table-scroll products-table-wrap">
            <table className="table products-table">
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '34%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th aria-sort={productSort.key === 'kodi' ? productSort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
                    <button type="button" className="sort-header" onClick={() => changeProductSort('kodi')}>
                      <span>Kodi</span>
                      <span className="sort-arrow" aria-hidden="true">{productSortArrow('kodi')}</span>
                    </button>
                  </th>
                  <th aria-sort={productSort.key === 'emri' ? productSort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
                    <button type="button" className="sort-header" onClick={() => changeProductSort('emri')}>
                      <span>Emri</span>
                      <span className="sort-arrow" aria-hidden="true">{productSortArrow('emri')}</span>
                    </button>
                  </th>
                  <th
                    style={{ textAlign: 'center' }}
                    aria-sort={
                      productSort.key === 'gjendje_kosove'
                        ? productSort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="sort-header centered"
                      onClick={() => changeProductSort('gjendje_kosove')}
                    >
                      <img className="flagIcon" src="/Flag_of_Kosovo.webp" alt="" />
                      <span>Gjendje</span>
                      <span className="sort-arrow" aria-hidden="true">
                        {productSortArrow('gjendje_kosove')}
                      </span>
                    </button>
                  </th>
                  <th
                    style={{ textAlign: 'center' }}
                    aria-sort={
                      productSort.key === 'gjendje_shqiperi'
                        ? productSort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="sort-header centered"
                      onClick={() => changeProductSort('gjendje_shqiperi')}
                    >
                      <img className="flagIcon" src="/Flag_of_Albania.svg" alt="" />
                      <span>Gjendje</span>
                      <span className="sort-arrow" aria-hidden="true">
                        {productSortArrow('gjendje_shqiperi')}
                      </span>
                    </button>
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sortedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      Nuk ka produkte. Shto produktin e pare me butonin me lart.
                    </td>
                  </tr>
                ) : (
                  sortedProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="product-text-cell">
                        <code className="product-text" data-full={p.kodi} title={p.kodi}>
                          {p.kodi}
                        </code>
                      </td>
                      <td className="product-name-cell product-text-cell">
                        <span className="product-text" data-full={p.emri} title={p.emri}>
                          {p.emri}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="stock-badge">{fmtInt(p.gjendje_kosove)}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="stock-badge">{fmtInt(p.gjendje_shqiperi)}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="product-actions">
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => setEditing(p)}
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
                            onClick={() => {
                              setProductError(null)
                              setDeletingProduct(p)
                            }}
                            disabled={deleteProductMut.isPending}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUMMARY / EXPORTS */}
        <div className="card summary-panel">
          <div className="row summary-header">
            <h3>Permbledhje</h3>
            <div className="spacer" />
            {summaryIsFetching && (
              <span className="muted" style={{ fontSize: 12 }}>
                Duke rifreskuar...
              </span>
            )}
            <a
              className="btn sm"
              href={exportUrl('xlsx', { from, to })}
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

          {/* Date Range */}
          <div className="summary-period">
            <label className="label">Periudha</label>
            <div className="form-row-equal summary-date-grid">
              <div className="form-group">
                <span className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Nga</span>
                <DateInput value={from} onChange={setFrom} style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <span className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Deri</span>
                <DateInput value={to} onChange={setTo} style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {summaryError && (
            <div
              style={{
                marginBottom: 12,
                padding: '10px 14px',
                background: 'var(--danger-bg)',
                borderRadius: 8,
                color: 'var(--danger)',
                fontSize: 13,
              }}
            >
              {summaryError instanceof Error ? summaryError.message : 'Nuk u lexua permbledhja.'}
            </div>
          )}

          <div className="summary-countries">
            <CountrySummary
              country="XK"
              name="Kosovo"
              flagSrc="/Flag_of_Kosovo.webp"
              summary={summaryKosove}
            />
            <CountrySummary
              country="AL"
              name="Albania"
              flagSrc="/Flag_of_Albania.svg"
              summary={summaryShqiperi}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          CONFIRM / ADD / EDIT PRODUCT MODALS
      ═══════════════════════════════════════════════════════════════ */}
      {confirmActionOpen && (
        <ConfirmModal
          title="Finalizo veprimin?"
          message={
            <span>
              {lloji} ne {countryLabel(country)}{' '}
              me total{' '}
              <strong className="num" style={{ color: 'var(--text)', whiteSpace: 'nowrap' }}>
                {fmt(actionTotal)}
              </strong>
              .
            </span>
          }
          confirmLabel={actionMutation.isPending ? 'Duke finalizuar...' : 'Finalizo'}
          tone="primary"
          loading={actionMutation.isPending}
          onCancel={() => setConfirmActionOpen(false)}
          onConfirm={() => {
            actionMutation.mutate(undefined, {
              onSettled: () => setConfirmActionOpen(false),
            })
          }}
        />
      )}

      {confirmTransferOpen && (
        <ConfirmModal
          title="Finalizo transferin?"
          message={
            <span>
              Transfer nga {countryLabel(transferFrom)} ne {countryLabel(transferTo)} me total{' '}
              <strong className="num" style={{ color: 'var(--text)', whiteSpace: 'nowrap' }}>
                {fmt(transferTotal)}
              </strong>
              .
            </span>
          }
          confirmLabel={transferMutation.isPending ? 'Duke finalizuar...' : 'Finalizo'}
          tone="primary"
          loading={transferMutation.isPending}
          onCancel={() => setConfirmTransferOpen(false)}
          onConfirm={() => {
            transferMutation.mutate(undefined, {
              onSettled: () => setConfirmTransferOpen(false),
            })
          }}
        />
      )}

      {transferDialogOpen && (
        <TransferModal
          from={transferFrom}
          to={transferTo}
          date={transferDate}
          items={transferItems}
          products={productsQuery.data ?? []}
          error={transferError}
          total={transferTotal}
          saving={transferMutation.isPending}
          onFromChange={setTransferFrom}
          onToChange={setTransferTo}
          onDateChange={setTransferDate}
          onAddItem={addTransferItem}
          onRemoveItem={removeTransferItem}
          onUpdateItem={updateTransferItem}
          onClose={() => {
            setTransferDialogOpen(false)
            setTransferError(null)
            setConfirmTransferOpen(false)
          }}
          onSubmit={submitTransfer}
        />
      )}

      {deletingProduct && (
        <ConfirmModal
          title="Fshij produktin?"
          message={`Produkti "${deletingProduct.emri}" do te fshihet bashke me historikun e veprimeve te tij.`}
          confirmLabel={deleteProductMut.isPending ? 'Duke fshire...' : 'Fshij'}
          tone="danger"
          loading={deleteProductMut.isPending}
          onCancel={() => setDeletingProduct(null)}
          onConfirm={() => deleteProductMut.mutate(deletingProduct.id)}
        />
      )}

      {showAddProduct && (
        <AddProductModal
          kodi={newKodi}
          emri={newEmri}
          gjendjeKosove={newGjendjeKosove}
          gjendjeShqiperi={newGjendjeShqiperi}
          error={productError}
          saving={createProductMut.isPending}
          onKodiChange={setNewKodi}
          onEmriChange={setNewEmri}
          onGjendjeKosoveChange={setNewGjendjeKosove}
          onGjendjeShqiperiChange={setNewGjendjeShqiperi}
          onSubmit={submitNewProduct}
          onClose={() => {
            setProductError(null)
            setShowAddProduct(false)
          }}
        />
      )}

      {editing && (
        <EditModal
          product={editing}
          onClose={() => setEditing(null)}
          onSave={(p) => updateProductMut.mutate(p)}
          saving={updateProductMut.isPending}
        />
      )}

      {snackbar && (
        <div className="snackbar" role="status" aria-live="polite">
          {snackbar}
        </div>
      )}
    </div>
  )
}

function ConfirmModal(props: {
  title: string
  message: React.ReactNode
  confirmLabel: string
  tone: 'primary' | 'success' | 'danger'
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-overlay" onClick={() => !props.loading && props.onCancel()}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: 18 }}>
          <h3>{props.title}</h3>
          <p className="muted confirm-message">
            {props.message}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn" onClick={props.onCancel} disabled={props.loading}>
            Anulo
          </button>
          <button
            type="button"
            className={`btn ${props.tone}`}
            onClick={props.onConfirm}
            disabled={props.loading}
          >
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionItemsTable(props: {
  items: ActionItem[]
  products: Produkti[]
  onUpdate: (key: string, field: keyof ActionItem, value: string | number) => void
  onRemove: (key: string) => void
}) {
  return (
    <div className="table-scroll action-table-wrap">
      <table className="table table-fixed action-table">
        <colgroup>
          <col style={{ width: '35%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Produkti</th>
            <th>Cmimi/Njesi</th>
            <th>Sasia</th>
            <th style={{ textAlign: 'right' }}>Totali</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {props.items.map((it) => {
            const lineTotal = (Number(it.cmimi_njesi) || 0) * (Number(it.sasia) || 0)
            return (
              <tr key={it.key}>
                <td>
                  <select
                    className="select"
                    value={it.kodi_produktit}
                    onChange={(e) => props.onUpdate(it.key, 'kodi_produktit', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Zgjedh produktin…</option>
                    {props.products.map((p) => (
                      <option
                        key={p.id}
                        value={p.kodi}
                        disabled={props.items.some(
                          (x) => x.key !== it.key && x.kodi_produktit === p.kodi,
                        )}
                      >
                        {p.emri} ({p.kodi})
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min={0}
                    value={it.cmimi_njesi}
                    onChange={(e) =>
                      props.onUpdate(
                        it.key,
                        'cmimi_njesi',
                        e.target.value.startsWith('-') ? '' : e.target.value,
                      )
                    }
                    placeholder="0.00"
                    style={{ width: '100%' }}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={it.sasia}
                    onChange={(e) => props.onUpdate(it.key, 'sasia', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="num">{fmt(lineTotal)}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => props.onRemove(it.key)}
                    disabled={props.items.length <= 1}
                    aria-label="Fshij produktin nga veprimi"
                    title={props.items.length <= 1 ? 'Duhet te kesh te pakten 1 produkt' : 'Fshij'}
                    style={{ fontSize: 22, lineHeight: 1, padding: '4px 10px' }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TransferModal(props: {
  from: Country
  to: Country
  date: string
  items: ActionItem[]
  products: Produkti[]
  error: string | null
  total: number
  saving: boolean
  onFromChange: (country: Country) => void
  onToChange: (country: Country) => void
  onDateChange: (date: string) => void
  onAddItem: () => void
  onRemoveItem: (key: string) => void
  onUpdateItem: (key: string, field: keyof ActionItem, value: string | number) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  const updateFrom = (next: Country) => {
    props.onFromChange(next)
    if (next === props.to) props.onToChange(next === 'XK' ? 'AL' : 'XK')
  }

  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-content transfer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 18 }}>
          <h3>Transfero produktet</h3>
          <div className="spacer" />
          <button type="button" className="btn ghost" onClick={props.onClose}>
            Mbyll
          </button>
        </div>

        <form onSubmit={props.onSubmit}>
          <div className="transfer-route modal-transfer-route">
            <div className="form-group">
              <label className="label">Nga</label>
              <select
                className="select"
                value={props.from}
                onChange={(e) => updateFrom(e.target.value as Country)}
              >
                <option value="XK">Kosove</option>
                <option value="AL">Shqiperi</option>
              </select>
            </div>
            <div className="transfer-arrow" aria-hidden="true">
              →
            </div>
            <div className="form-group">
              <label className="label">Ne</label>
              <select
                className="select"
                value={props.to}
                onChange={(e) => props.onToChange(e.target.value as Country)}
              >
                <option value="XK" disabled={props.from === 'XK'}>
                  Kosove
                </option>
                <option value="AL" disabled={props.from === 'AL'}>
                  Shqiperi
                </option>
              </select>
            </div>
            <div className="transfer-hint">
              Transfer: {countryLabel(props.from)} → {countryLabel(props.to)}
            </div>
          </div>

          <div className="row transfer-date-row" style={{ gap: 8, margin: '16px 0 20px' }}>
            <span className="muted" style={{ fontSize: 13 }}>Data e Veprimit</span>
            <DateInput value={props.date} onChange={props.onDateChange} style={{ width: 150 }} />
          </div>

          <ActionItemsTable
            items={props.items}
            products={props.products}
            onUpdate={props.onUpdateItem}
            onRemove={props.onRemoveItem}
          />

          <div className="row action-footer" style={{ marginTop: 16 }}>
            <button type="button" className="btn" onClick={props.onAddItem}>
              + Shto produkt
            </button>
            <div className="spacer" />
            <div className="row action-total" style={{ gap: 8 }}>
              <span className="muted">Total:</span>
              <span className="num-lg">{fmt(props.total)}</span>
            </div>
            <button
              type="submit"
              className="btn primary action-submit"
              disabled={props.saving}
              style={{ marginLeft: 16 }}
            >
              {props.saving ? 'Duke finalizuar…' : 'Finalizo Transferin'}
            </button>
          </div>

          {props.error && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                background: 'var(--danger-bg)',
                borderRadius: 8,
                color: 'var(--danger)',
                fontSize: 14,
              }}
            >
              {props.error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

function CountrySummary(props: {
  country: Country
  name: string
  flagSrc: string
  summary: SummaryData
}) {
  return (
    <section className="summary-country">
      <div className="summary-country-title">
        <img className="flagIcon" src={props.flagSrc} alt={props.country} />
        <span>{props.name}</span>
      </div>

      <div className="summary-mini-grid">
        <SummaryMiniCard
          tone="success"
          label="Hyrje"
          quantity={props.summary.in_qty}
          value={props.summary.in_value}
        />
        <SummaryMiniCard
          tone="danger"
          label="Dalje"
          quantity={props.summary.out_qty}
          value={props.summary.out_value}
        />
      </div>
    </section>
  )
}

function SummaryMiniCard(props: {
  tone: 'success' | 'danger'
  label: string
  quantity: number
  value: number
}) {
  return (
    <div className={`summary-card compact ${props.tone}`}>
      <div className="summary-label">{props.label}</div>
      <div className="summary-value">{fmtInt(props.quantity)}</div>
      <div className="summary-sub">{fmt(props.value)} €</div>
    </div>
  )
}

function DateInput(props: {
  value: string
  onChange: (value: string) => void
  style?: React.CSSProperties
}) {
  const pickerRef = React.useRef<HTMLInputElement | null>(null)

  const openPicker = React.useCallback(() => {
    const picker = pickerRef.current
    if (!picker) return
    picker.focus()
    ;(picker as unknown as { showPicker?: () => void }).showPicker?.()
  }, [])

  return (
    <div
      className="date-input"
      style={props.style}
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openPicker()
        }
      }}
    >
      <input
        className="input date-input-display"
        type="text"
        value={formatDisplayDate(props.value)}
        readOnly
        aria-label="Zgjedh daten"
      />
      <input
        ref={pickerRef}
        className="date-input-native"
        type="date"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}

function AddProductModal(props: {
  kodi: string
  emri: string
  gjendjeKosove: number
  gjendjeShqiperi: number
  error: string | null
  saving: boolean
  onKodiChange: (value: string) => void
  onEmriChange: (value: string) => void
  onGjendjeKosoveChange: (value: number) => void
  onGjendjeShqiperiChange: (value: number) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}) {
  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <form className="modal-content" onSubmit={props.onSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 20 }}>
          <h3>Shto produkt te ri</h3>
          <div className="spacer" />
          <button type="button" className="btn ghost" onClick={props.onClose}>
            Mbyll
          </button>
        </div>

        <div className="form-grid">
          <div className="form-row">
            <div className="form-group">
              <label className="label">Kodi</label>
              <input
                className="input"
                value={props.kodi}
                onChange={(e) => props.onKodiChange(e.target.value)}
                placeholder="P001"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="label">Emri</label>
              <input
                className="input"
                value={props.emri}
                onChange={(e) => props.onEmriChange(e.target.value)}
                placeholder="Emri i produktit"
              />
            </div>
          </div>

          <div>
            <label className="label">Gjendje fillestare</label>
            <div className="form-row-equal" style={{ marginTop: 6 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--card-soft)',
                  padding: '10px 14px',
                  borderRadius: 8,
                }}
              >
                <img className="flagIcon" src="/Flag_of_Kosovo.webp" alt="" />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Kosova</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={props.gjendjeKosove}
                  onChange={(e) => props.onGjendjeKosoveChange(Number(e.target.value))}
                  style={{ width: 80, marginLeft: 'auto', textAlign: 'right' }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--card-soft)',
                  padding: '10px 14px',
                  borderRadius: 8,
                }}
              >
                <img className="flagIcon" src="/Flag_of_Albania.svg" alt="" />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Shqiperia</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={props.gjendjeShqiperi}
                  onChange={(e) => props.onGjendjeShqiperiChange(Number(e.target.value))}
                  style={{ width: 80, marginLeft: 'auto', textAlign: 'right' }}
                />
              </div>
            </div>
          </div>

          {props.error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--danger-bg)',
                borderRadius: 8,
                color: 'var(--danger)',
                fontSize: 13,
              }}
            >
              {props.error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn" onClick={props.onClose}>
              Anulo
            </button>
            <button type="submit" className="btn primary" disabled={props.saving}>
              {props.saving ? 'Duke shtuar...' : 'Shto Produktin'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function EditModal(props: {
  product: Produkti
  saving: boolean
  onClose: () => void
  onSave: (p: Produkti) => void
}) {
  const [kodi, setKodi] = React.useState(props.product.kodi)
  const [emri, setEmri] = React.useState(props.product.emri)
  const [xk, setXk] = React.useState(props.product.gjendje_kosove)
  const [al, setAl] = React.useState(props.product.gjendje_shqiperi)

  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 20 }}>
          <h3>Ndrysho produktin</h3>
          <div className="spacer" />
          <button type="button" className="btn ghost" onClick={props.onClose}>
            Mbyll
          </button>
        </div>

        <div className="form-grid">
          {/* Row 1: Kodi + Emri */}
          <div className="form-row">
            <div className="form-group">
              <label className="label">Kodi</label>
              <input
                className="input"
                value={kodi}
                onChange={(e) => setKodi(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Emri</label>
              <input
                className="input"
                value={emri}
                onChange={(e) => setEmri(e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: Stocks */}
          <div>
            <label className="label">Gjendje</label>
            <div className="form-row-equal" style={{ marginTop: 6 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--card-soft)',
                  padding: '10px 14px',
                  borderRadius: 8,
                }}
              >
                <img className="flagIcon" src="/Flag_of_Kosovo.webp" alt="" />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Kosova</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={xk}
                  onChange={(e) => setXk(Number(e.target.value))}
                  style={{ width: 80, marginLeft: 'auto', textAlign: 'right' }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--card-soft)',
                  padding: '10px 14px',
                  borderRadius: 8,
                }}
              >
                <img className="flagIcon" src="/Flag_of_Albania.svg" alt="" />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Shqiperia</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={al}
                  onChange={(e) => setAl(Number(e.target.value))}
                  style={{ width: 80, marginLeft: 'auto', textAlign: 'right' }}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn" onClick={props.onClose}>
              Anulo
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() =>
                props.onSave({
                  ...props.product,
                  kodi,
                  emri,
                  gjendje_kosove: xk,
                  gjendje_shqiperi: al,
                })
              }
              disabled={props.saving}
            >
              {props.saving ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
