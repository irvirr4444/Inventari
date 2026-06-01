import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CountrySelector, useCountry } from '../lib/country'
import { createActionBatch, listProducts } from '../lib/api'

type Item = {
  key: string
  kodi_produktit: string
  cmimi_njesi: string
  sasia: number
}

function todayISODate() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function ActionsPage() {
  const { country } = useCountry()
  const qc = useQueryClient()

  const [lloji, setLloji] = React.useState<'Hyrje' | 'Dalje'>('Hyrje')
  const [data, setData] = React.useState<string>(todayISODate())
  const dateRef = React.useRef<HTMLInputElement | null>(null)
  const [items, setItems] = React.useState<Item[]>([
    { key: crypto.randomUUID(), kodi_produktit: '', cmimi_njesi: '', sasia: 1 },
  ])
  const [error, setError] = React.useState<string | null>(null)

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => listProducts({}),
    initialData: [],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const mutation = useMutation({
    mutationFn: () =>
      createActionBatch({
        shteti: country,
        lloji,
        data,
        items: items
          .filter((i) => i.kodi_produktit.trim())
          .map((i) => ({
            kodi_produktit: i.kodi_produktit.trim(),
            cmimi_njesi: Number(i.cmimi_njesi) || 0,
            sasia: Number(i.sasia) || 0,
          })),
      }),
    onSuccess: async () => {
      setError(null)
      setItems([
        { key: crypto.randomUUID(), kodi_produktit: '', cmimi_njesi: '', sasia: 1 },
      ])
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['products'] }),
        qc.invalidateQueries({ queryKey: ['analytics-stock', country] }),
        qc.invalidateQueries({ queryKey: ['analytics-summary', country] }),
      ])
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  })

  const total = items.reduce(
    (sum, it) => sum + (Number(it.cmimi_njesi) || 0) * (Number(it.sasia) || 0),
    0,
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const clean = items.filter((i) => i.kodi_produktit.trim())
    if (clean.length === 0) {
      setError('Shto te pakten nje produkt.')
      return
    }
    for (const it of clean) {
      if (!it.kodi_produktit.trim()) {
        setError('Produkti eshte i detyrueshem.')
        return
      }
      if (Number(it.sasia) <= 0) {
        setError('Sasia duhet te jete > 0.')
        return
      }
      if (Number(it.cmimi_njesi) < 0) {
        setError('Cmimi/Njesi duhet te jete >= 0.')
        return
      }
    }
    mutation.mutate()
  }

  const openDatePicker = React.useCallback(() => {
    const el = dateRef.current
    if (!el) return
    el.focus()
    const anyEl = el as unknown as { showPicker?: () => void }
    anyEl.showPicker?.()
  }, [])

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Veprime (Hyrje/Dalje)</h2>

      <form onSubmit={submit}>
        <div className="row">
          <button
            type="button"
            className={`btn ${lloji === 'Hyrje' ? 'primary' : ''}`}
            onClick={() => setLloji('Hyrje')}
          >
            Hyrje (IN)
          </button>
          <button
            type="button"
            className={`btn ${lloji === 'Dalje' ? 'primary' : ''}`}
            onClick={() => setLloji('Dalje')}
          >
            Dalje (OUT)
          </button>

          <div className="spacer" />

          <span className="muted">Shteti</span>
          <CountrySelector />

          <label
            className="row"
            style={{ gap: 8 }}
            onClick={(e) => {
              if (e.target !== dateRef.current) openDatePicker()
            }}
          >
            <span className="muted">Data</span>
            <input
              ref={dateRef}
              className="input"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              onClick={openDatePicker}
            />
          </label>
        </div>

        <div style={{ height: 12 }} />

        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 260 }}>Produkti</th>
              <th>Cmimi/Njesi</th>
              <th>Sasia</th>
              <th>Totali</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const lineTotal = (Number(it.cmimi_njesi) || 0) * (Number(it.sasia) || 0)
              return (
                <tr key={it.key}>
                  <td>
                    <select
                      className="select"
                      value={it.kodi_produktit}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) => (x.key === it.key ? { ...x, kodi_produktit: e.target.value } : x)),
                        )
                      }
                      style={{ width: '100%' }}
                    >
                      <option value="">Zgjedh produktin…</option>
                      {(productsQuery.data ?? []).map((p) => (
                        <option key={p.id} value={p.kodi}>
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
                        setItems((prev) =>
                          prev.map((x) =>
                            x.key === it.key
                              ? { ...x, cmimi_njesi: e.target.value.startsWith('-') ? '' : e.target.value }
                              : x,
                          ),
                        )
                      }
                      placeholder="—"
                      style={{ width: 140 }}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={it.sasia}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) => (x.key === it.key ? { ...x, sasia: Number(e.target.value) } : x)),
                        )
                      }
                      style={{ width: 110 }}
                    />
                  </td>
                  <td>{lineTotal.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setItems((prev) => prev.filter((x) => x.key !== it.key))}
                      disabled={items.length <= 1}
                    >
                      Fshij
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div style={{ height: 12 }} />

        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() =>
              setItems((prev) => [
                ...prev,
                { key: crypto.randomUUID(), kodi_produktit: '', cmimi_njesi: '', sasia: 1 },
              ])
            }
          >
            + Shto produkt
          </button>

          <div className="spacer" />
          <div>
            <span className="muted">Total:</span> <strong>{total.toFixed(2)}</strong>
          </div>
          <button type="submit" className="btn primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Duke finalizuar...' : 'Finalizo veprimin'}
          </button>
        </div>

        {error ? (
          <div style={{ marginTop: 10, color: '#b91c1c' }}>
            <strong>Error:</strong> {error}
          </div>
        ) : null}

      </form>
    </div>
  )
}

