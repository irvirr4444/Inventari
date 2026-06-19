import * as React from 'react'
import { ErrorAlert } from '../../components/ErrorAlert'
import { Modal } from '../../components/Modal'
import { NumericInput } from '../../components/NumericInput'
import type { DynamicProdukti } from '../../lib/api'
import { stockRecord } from '../../lib/api'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { locationBadge } from '../../lib/lokacioni/LokacioniProvider'

type StockGridProps = {
  locations: Lokacioni[]
  stock: Record<string, number>
  onChange: (lokacioniId: string, value: number) => void
  label: string
}

function DynamicStockFields(props: StockGridProps) {
  const useTable = props.locations.length > 3

  if (useTable) {
    return (
      <div className="dynamic-stock-table-wrap">
        <label className="label">{props.label}</label>
        <table className="table dynamic-stock-table">
          <thead>
            <tr>
              <th>Lokacioni</th>
              <th>Sasia</th>
            </tr>
          </thead>
          <tbody>
            {props.locations.map((loc) => (
              <tr key={loc.id}>
                <td>
                  <span className="row" style={{ gap: 6 }}>
                    {locationBadge(loc)} {loc.emri}
                  </span>
                </td>
                <td>
                  <NumericInput
                    className="input stock-field-input"
                    min={0}
                    value={props.stock[loc.id] ?? 0}
                    onChange={(v) =>
                      props.onChange(loc.id, v === '' ? 0 : Number(v))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="stock-fields">
      <label className="label">{props.label}</label>
      <div className="dynamic-stock-grid">
        {props.locations.map((loc) => (
          <div key={loc.id} className="stock-field">
            <div className="stock-field-head">
              <span>{locationBadge(loc)}</span>
              <span>{loc.emri}</span>
            </div>
            <NumericInput
              className="input stock-field-input"
              min={0}
              value={props.stock[loc.id] ?? 0}
              onChange={(v) => props.onChange(loc.id, v === '' ? 0 : Number(v))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

type DynamicProductFormModalProps =
  | {
      mode: 'create'
      kodi: string
      emri: string
      stock: Record<string, number>
      locations: Lokacioni[]
      error: string | null
      saving: boolean
      onKodiChange: (value: string) => void
      onEmriChange: (value: string) => void
      onStockChange: (lokacioniId: string, value: number) => void
      onSubmit: (e: React.FormEvent) => void
      onClose: () => void
    }
  | {
      mode: 'edit'
      product: DynamicProdukti
      locations: Lokacioni[]
      saving: boolean
      onSave: (input: { product: DynamicProdukti; stock: Record<string, number> }) => void
      onClose: () => void
    }

function EditDynamicProductForm(
  props: Extract<DynamicProductFormModalProps, { mode: 'edit' }>,
) {
  const [kodi, setKodi] = React.useState(props.product.kodi)
  const [emri, setEmri] = React.useState(props.product.emri)
  const [stock, setStock] = React.useState(() => stockRecord(props.product))

  const updateStock = (lokacioniId: string, value: number) => {
    setStock((prev) => ({ ...prev, [lokacioniId]: value }))
  }

  return (
    <Modal open title="Ndrysho produktin" onClose={props.onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          props.onSave({
            product: { ...props.product, kodi, emri },
            stock,
          })
        }}
      >
        <div className="form-group">
          <label className="label">Kodi</label>
          <input className="input" value={kodi} onChange={(e) => setKodi(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Emri</label>
          <input className="input" value={emri} onChange={(e) => setEmri(e.target.value)} />
        </div>
        <DynamicStockFields
          locations={props.locations}
          stock={stock}
          onChange={updateStock}
          label="Gjendja"
        />
        <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn" onClick={props.onClose}>Anulo</button>
          <button type="submit" className="btn primary" disabled={props.saving}>
            {props.saving ? 'Duke ruajtur…' : 'Ruaj'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function DynamicProductFormModal(props: DynamicProductFormModalProps) {
  if (props.mode === 'edit') {
    return <EditDynamicProductForm {...props} />
  }

  return (
    <Modal open title="Shto produkt" onClose={props.onClose}>
      <form onSubmit={props.onSubmit}>
        <div className="form-group">
          <label className="label">Kodi</label>
          <input
            className="input"
            value={props.kodi}
            onChange={(e) => props.onKodiChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Emri</label>
          <input
            className="input"
            value={props.emri}
            onChange={(e) => props.onEmriChange(e.target.value)}
          />
        </div>
        <DynamicStockFields
          locations={props.locations}
          stock={props.stock}
          onChange={props.onStockChange}
          label="Gjendja fillestare"
        />
        {props.error && <ErrorAlert message={props.error} style={{ marginTop: 12 }} />}
        <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn" onClick={props.onClose}>Anulo</button>
          <button type="submit" className="btn primary" disabled={props.saving}>
            {props.saving ? 'Duke shtuar…' : 'Shto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
