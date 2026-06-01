import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createProduct, deleteProduct, listProducts, updateProduct, type Produkti } from '../lib/api'

export function ProductsPage() {
  const qc = useQueryClient()

  const [search, setSearch] = React.useState('')
  const [newKodi, setNewKodi] = React.useState('')
  const [newEmri, setNewEmri] = React.useState('')
  const [newPershkrimi, setNewPershkrimi] = React.useState('')
  const [newGjendjeKosove, setNewGjendjeKosove] = React.useState<number>(0)
  const [newGjendjeShqiperi, setNewGjendjeShqiperi] = React.useState<number>(0)

  const [editing, setEditing] = React.useState<Produkti | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const productsQuery = useQuery({
    queryKey: ['products', search],
    queryFn: () => listProducts({ search }),
  })

  const createMut = useMutation({
    mutationFn: () =>
      createProduct({
        kodi: newKodi.trim(),
        emri: newEmri.trim(),
        pershkrimi: newPershkrimi.trim() || undefined,
        gjendje_kosove: Number(newGjendjeKosove) || 0,
        gjendje_shqiperi: Number(newGjendjeShqiperi) || 0,
      }),
    onSuccess: async () => {
      setError(null)
      setNewKodi('')
      setNewEmri('')
      setNewPershkrimi('')
      setNewGjendjeKosove(0)
      setNewGjendjeShqiperi(0)
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  })

  const updateMut = useMutation({
    mutationFn: (payload: {
      id: string
      kodi: string
      emri: string
      pershkrimi: string
      gjendje_kosove: number
      gjendje_shqiperi: number
    }) =>
      updateProduct(payload.id, {
        kodi: payload.kodi.trim(),
        emri: payload.emri.trim(),
        pershkrimi: payload.pershkrimi.trim() || null,
        gjendje_kosove: payload.gjendje_kosove,
        gjendje_shqiperi: payload.gjendje_shqiperi,
      }),
    onSuccess: async () => {
      setError(null)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async () => {
      setError(null)
      await qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  })

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!newKodi.trim() || !newEmri.trim()) {
      setError('Kodi dhe Emri jane te detyrueshem.')
      return
    }
    createMut.mutate()
  }

  return (
    <div className="card">
      <div className="row">
        <h2 style={{ margin: 0 }}>Produkte</h2>
        <div className="spacer" />
        <div style={{ position: 'relative', width: 260 }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            <path
              d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M16.5 16.5 21 21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            className="input"
            placeholder="Kerko me kod ose emer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 34 }}
          />
        </div>
      </div>

      <div style={{ height: 12 }} />

      <form onSubmit={submitNew} className="card" style={{ background: '#fafafa' }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ width: 160 }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              Kodi
            </div>
            <input
              className="input"
              value={newKodi}
              onChange={(e) => setNewKodi(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ width: 260 }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              Emri
            </div>
            <input
              className="input"
              value={newEmri}
              onChange={(e) => setNewEmri(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              Pershkrimi
            </div>
            <input
              className="input"
              value={newPershkrimi}
              onChange={(e) => setNewPershkrimi(e.target.value)}
              style={{ width: '100%' }}
              placeholder="(opsionale)"
            />
          </div>

          <div style={{ width: 240 }}>
            <div
              className="muted row"
              style={{
                marginBottom: 6,
                gap: 8,
                flexWrap: 'nowrap',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                fontSize: 13,
              }}
            >
              <img className="flagIcon" src="/Flag_of_Kosovo.webp" alt="" />
              <span style={{ whiteSpace: 'nowrap' }}>Gjendja fillestare Kosove</span>
            </div>
            <input
              className="input"
              type="number"
              min={0}
              value={newGjendjeKosove}
              onChange={(e) => setNewGjendjeKosove(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ width: 260 }}>
            <div
              className="muted row"
              style={{
                marginBottom: 6,
                gap: 8,
                flexWrap: 'nowrap',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                fontSize: 13,
              }}
            >
              <img className="flagIcon" src="/Flag_of_Albania.svg" alt="" />
              <span style={{ whiteSpace: 'nowrap' }}>Gjendja fillestare Shqiperi</span>
            </div>
            <input
              className="input"
              type="number"
              min={0}
              value={newGjendjeShqiperi}
              onChange={(e) => setNewGjendjeShqiperi(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <button className="btn primary" type="submit" disabled={createMut.isPending}>
            {createMut.isPending ? 'Saving…' : 'Shto +'}
          </button>
        </div>
      </form>

      <div style={{ height: 12 }} />

      {productsQuery.isLoading ? <div className="muted">Loading…</div> : null}

      <table className="table">
        <thead>
          <tr>
            <th>Kodi</th>
            <th>Emri</th>
            <th>Pershkrimi</th>
            <th>Gjendje Kosove</th>
            <th>Gjendje Shqiperi</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(productsQuery.data ?? []).map((p) => (
            <tr key={p.id}>
              <td>{p.kodi}</td>
              <td>{p.emri}</td>
              <td className="muted">{p.pershkrimi ?? ''}</td>
              <td>
                <strong>{p.gjendje_kosove}</strong>
              </td>
              <td>
                <strong>{p.gjendje_shqiperi}</strong>
              </td>
              <td style={{ textAlign: 'right' }}>
                <button className="btn" type="button" onClick={() => setEditing(p)}>
                  Edit
                </button>{' '}
                <button
                  className="btn danger"
                  type="button"
                  onClick={() => deleteMut.mutate(p.id)}
                  disabled={deleteMut.isPending}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error ? (
        <div style={{ marginTop: 10, color: '#b91c1c' }}>
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      {editing ? (
        <EditModal
          product={editing}
          onClose={() => setEditing(null)}
          onSave={(next) => updateMut.mutate(next)}
          saving={updateMut.isPending}
        />
      ) : null}
    </div>
  )
}

function EditModal(props: {
  product: Produkti
  saving: boolean
  onClose: () => void
  onSave: (next: {
    id: string
    kodi: string
    emri: string
    pershkrimi: string
    gjendje_kosove: number
    gjendje_shqiperi: number
  }) => void
}) {
  const [kodi, setKodi] = React.useState(props.product.kodi)
  const [emri, setEmri] = React.useState(props.product.emri)
  const [pershkrimi, setPershkrimi] = React.useState(props.product.pershkrimi ?? '')
  const [gjendjeKosove, setGjendjeKosove] = React.useState<number>(props.product.gjendje_kosove)
  const [gjendjeShqiperi, setGjendjeShqiperi] = React.useState<number>(props.product.gjendje_shqiperi)

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={props.onClose}
    >
      <div className="card" style={{ width: 600, maxWidth: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h3 style={{ margin: 0 }}>Edit product</h3>
          <div className="spacer" />
          <button className="btn" type="button" onClick={props.onClose}>
            Close
          </button>
        </div>
        <div style={{ height: 12 }} />
        <div className="row">
          <input className="input" value={kodi} onChange={(e) => setKodi(e.target.value)} style={{ width: 160 }} />
          <input className="input" value={emri} onChange={(e) => setEmri(e.target.value)} style={{ flex: 1 }} />
        </div>
        <div style={{ height: 10 }} />
        <div className="row">
          <input
            className="input"
            type="number"
            value={gjendjeKosove}
            onChange={(e) => setGjendjeKosove(Number(e.target.value))}
            style={{ width: 180 }}
            placeholder="Gjendje Kosove"
          />
          <input
            className="input"
            type="number"
            value={gjendjeShqiperi}
            onChange={(e) => setGjendjeShqiperi(Number(e.target.value))}
            style={{ width: 190 }}
            placeholder="Gjendje Shqiperi"
          />
        </div>
        <div style={{ height: 10 }} />
        <textarea
          className="input"
          value={pershkrimi}
          onChange={(e) => setPershkrimi(e.target.value)}
          placeholder="Pershkrimi"
          style={{ width: '100%', minHeight: 90 }}
        />
        <div style={{ height: 12 }} />
        <div className="row">
          <div className="spacer" />
          <button
            className="btn primary"
            type="button"
            onClick={() =>
              props.onSave({
                id: props.product.id,
                kodi,
                emri,
                pershkrimi,
                gjendje_kosove: Number(gjendjeKosove) || 0,
                gjendje_shqiperi: Number(gjendjeShqiperi) || 0,
              })
            }
            disabled={props.saving}
          >
            {props.saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

