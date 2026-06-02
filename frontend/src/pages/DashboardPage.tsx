import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CountrySelector, useCountry } from '../lib/country'
import {
  analyticsSummary,
  createActionBatch,
  createProduct,
  deleteProduct,
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

function todayISODate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoDateDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-US')
}

export function DashboardPage() {
  const { country } = useCountry()
  const qc = useQueryClient()

  // ─────────────────────────────────────────────────────────────
  // ACTION ENTRY STATE
  // ─────────────────────────────────────────────────────────────
  const [lloji, setLloji] = React.useState<'Hyrje' | 'Dalje'>('Hyrje')
  const [actionDate, setActionDate] = React.useState(todayISODate())
  const dateRef = React.useRef<HTMLInputElement | null>(null)
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
  const [newPershkrimi, setNewPershkrimi] = React.useState('')
  const [newGjendjeKosove, setNewGjendjeKosove] = React.useState(0)
  const [newGjendjeShqiperi, setNewGjendjeShqiperi] = React.useState(0)
  const [editing, setEditing] = React.useState<Produkti | null>(null)
  const [deletingProduct, setDeletingProduct] = React.useState<Produkti | null>(null)
  const [productError, setProductError] = React.useState<string | null>(null)

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
    onError: (e) => setActionError(e instanceof Error ? e.message : 'Error'),
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
        pershkrimi: newPershkrimi.trim() || undefined,
        gjendje_kosove: Number(newGjendjeKosove) || 0,
        gjendje_shqiperi: Number(newGjendjeShqiperi) || 0,
      }),
    onSuccess: async () => {
      setProductError(null)
      setNewKodi('')
      setNewEmri('')
      setNewPershkrimi('')
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
        pershkrimi: p.pershkrimi?.trim() || null,
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
  const openDatePicker = React.useCallback(() => {
    const el = dateRef.current
    if (!el) return
    el.focus()
    ;(el as unknown as { showPicker?: () => void }).showPicker?.()
  }, [])

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

  const actionTotal = actionItems.reduce(
    (sum, it) => sum + (Number(it.cmimi_njesi) || 0) * (Number(it.sasia) || 0),
    0
  )
  const emptySummary: SummaryData = { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 }
  const summaryKosove = summaryKosoveQuery.data ?? emptySummary
  const summaryShqiperi = summaryShqiperiQuery.data ?? emptySummary
  const summaryIsFetching = summaryKosoveQuery.isFetching || summaryShqiperiQuery.isFetching
  const summaryError = summaryKosoveQuery.error ?? summaryShqiperiQuery.error

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ═══════════════════════════════════════════════════════════════
          ACTION ENTRY (TOP)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="card">
        <div className="row" style={{ marginBottom: 20 }}>
          <h2>Regjistro Veprim</h2>
          <div className="spacer" />
          <div className="row" style={{ gap: 16 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>Shteti</span>
              <CountrySelector />
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>Data e Veprimit</span>
              <input
                ref={dateRef}
                className="input"
                type="date"
                value={actionDate}
                onChange={(e) => setActionDate(e.target.value)}
                onClick={openDatePicker}
                style={{ width: 150 }}
              />
            </div>
          </div>
        </div>

        <form onSubmit={submitAction}>
          {/* Toggle Buttons */}
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

          {/* Action Items Table */}
          <table className="table table-fixed">
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
              {actionItems.map((it) => {
                const lineTotal = (Number(it.cmimi_njesi) || 0) * (Number(it.sasia) || 0)
                return (
                  <tr key={it.key}>
                    <td>
                      <select
                        className="select"
                        value={it.kodi_produktit}
                        onChange={(e) => updateActionItem(it.key, 'kodi_produktit', e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="">Zgjedh produktin…</option>
                        {(productsQuery.data ?? []).map((p) => (
                          <option
                            key={p.id}
                            value={p.kodi}
                            disabled={actionItems.some(
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
                          updateActionItem(
                            it.key,
                            'cmimi_njesi',
                            e.target.value.startsWith('-') ? '' : e.target.value
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
                        onChange={(e) => updateActionItem(it.key, 'sasia', Number(e.target.value))}
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
                        onClick={() => removeActionItem(it.key)}
                        disabled={actionItems.length <= 1}
                        aria-label="Fshij produktin nga veprimi"
                        title={actionItems.length <= 1 ? 'Duhet te kesh te pakten 1 produkt' : 'Fshij'}
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

          {/* Footer */}
          <div className="row" style={{ marginTop: 16 }}>
            <button type="button" className="btn" onClick={addActionItem}>
              + Shto produkt
            </button>
            <div className="spacer" />
            <div className="row" style={{ gap: 8 }}>
              <span className="muted">Total:</span>
              <span className="num-lg">{fmt(actionTotal)}</span>
            </div>
            <button
              type="submit"
              className="btn primary"
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        {/* PRODUCTS */}
        <div className="card">
          <div className="row" style={{ marginBottom: 16 }}>
            <h3>Produkte</h3>
            <div className="spacer" />
            <button type="button" className="btn" onClick={() => setShowAddProduct(true)}>
              + Shto produkt
            </button>
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
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Kodi</th>
                <th>Emri</th>
                <th>Pershkrimi</th>
                <th style={{ textAlign: 'center', width: 100 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <img className="flagIcon" src="/Flag_of_Kosovo.webp" alt="" />
                    Gjendje
                  </span>
                </th>
                <th style={{ textAlign: 'center', width: 100 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <img className="flagIcon" src="/Flag_of_Albania.svg" alt="" />
                    Gjendje
                  </span>
                </th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {(productsQuery.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    Nuk ka produkte. Shto produktin e pare me butonin me lart.
                  </td>
                </tr>
              ) : (
                (productsQuery.data ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.kodi}</code>
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.emri}</td>
                    <td className="muted" style={{ fontSize: 13 }}>
                      {p.pershkrimi || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="stock-badge">{fmtInt(p.gjendje_kosove)}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="stock-badge">{fmtInt(p.gjendje_shqiperi)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
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

        {/* SUMMARY / EXPORTS */}
        <div className="card">
          <div className="row" style={{ marginBottom: 16 }}>
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
          <div style={{ marginBottom: 16 }}>
            <label className="label">Periudha</label>
            <div className="form-row-equal" style={{ marginTop: 6 }}>
              <div className="form-group">
                <span className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Nga</span>
                <input
                  className="input"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <span className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Deri</span>
                <input
                  className="input"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  style={{ width: '100%' }}
                />
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
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
              {lloji} ne {country === 'XK' ? 'Kosove' : 'Shqiperi'} me total{' '}
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
          pershkrimi={newPershkrimi}
          gjendjeKosove={newGjendjeKosove}
          gjendjeShqiperi={newGjendjeShqiperi}
          error={productError}
          saving={createProductMut.isPending}
          onKodiChange={setNewKodi}
          onEmriChange={setNewEmri}
          onPershkrimiChange={setNewPershkrimi}
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

function AddProductModal(props: {
  kodi: string
  emri: string
  pershkrimi: string
  gjendjeKosove: number
  gjendjeShqiperi: number
  error: string | null
  saving: boolean
  onKodiChange: (value: string) => void
  onEmriChange: (value: string) => void
  onPershkrimiChange: (value: string) => void
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

          <div className="form-group">
            <label className="label">Pershkrimi (opsionale)</label>
            <textarea
              className="input"
              value={props.pershkrimi}
              onChange={(e) => props.onPershkrimiChange(e.target.value)}
              placeholder="Pershkrim i shkurter..."
              style={{ minHeight: 80 }}
            />
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
  const [pershkrimi, setPershkrimi] = React.useState(props.product.pershkrimi ?? '')
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

          {/* Row 3: Pershkrimi */}
          <div className="form-group">
            <label className="label">Pershkrimi</label>
            <textarea
              className="input"
              value={pershkrimi}
              onChange={(e) => setPershkrimi(e.target.value)}
              style={{ minHeight: 80 }}
            />
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
                  pershkrimi,
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
