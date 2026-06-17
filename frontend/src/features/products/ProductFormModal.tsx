import * as React from 'react'
import { ErrorAlert } from '../../components/ErrorAlert'
import { Modal } from '../../components/Modal'
import type { Produkti } from '../../lib/api'

type StockFieldsProps = {
  gjendjeKosove: number
  gjendjeShqiperi: number
  onGjendjeKosoveChange: (value: number) => void
  onGjendjeShqiperiChange: (value: number) => void
  label: string
}

function StockFields(props: StockFieldsProps) {
  return (
    <div>
      <label className="label">{props.label}</label>
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
  )
}

type ProductFormModalProps =
  | {
      mode: 'create'
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
    }
  | {
      mode: 'edit'
      product: Produkti
      saving: boolean
      onSave: (p: Produkti) => void
      onClose: () => void
    }

function EditProductForm(props: Extract<ProductFormModalProps, { mode: 'edit' }>) {
  const [kodi, setKodi] = React.useState(props.product.kodi)
  const [emri, setEmri] = React.useState(props.product.emri)
  const [gjendjeKosove, setGjendjeKosove] = React.useState(props.product.gjendje_kosove)
  const [gjendjeShqiperi, setGjendjeShqiperi] = React.useState(props.product.gjendje_shqiperi)

  return (
    <Modal open title="Ndrysho produktin" onClose={props.onClose}>
      <div className="form-grid">
        <div className="form-row">
          <div className="form-group">
            <label className="label">Kodi</label>
            <input className="input" value={kodi} onChange={(e) => setKodi(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Emri</label>
            <input className="input" value={emri} onChange={(e) => setEmri(e.target.value)} />
          </div>
        </div>

        <StockFields
          label="Gjendje"
          gjendjeKosove={gjendjeKosove}
          gjendjeShqiperi={gjendjeShqiperi}
          onGjendjeKosoveChange={setGjendjeKosove}
          onGjendjeShqiperiChange={setGjendjeShqiperi}
        />

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
                gjendje_kosove: gjendjeKosove,
                gjendje_shqiperi: gjendjeShqiperi,
              })
            }
            disabled={props.saving}
          >
            {props.saving ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CreateProductForm(props: Extract<ProductFormModalProps, { mode: 'create' }>) {
  return (
    <Modal open title="Shto produkt te ri" onClose={props.onClose}>
      <form onSubmit={props.onSubmit}>
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

          <StockFields
            label="Gjendje fillestare"
            gjendjeKosove={props.gjendjeKosove}
            gjendjeShqiperi={props.gjendjeShqiperi}
            onGjendjeKosoveChange={props.onGjendjeKosoveChange}
            onGjendjeShqiperiChange={props.onGjendjeShqiperiChange}
          />

          {props.error && (
            <ErrorAlert message={props.error} style={{ padding: '10px 14px', fontSize: 13 }} />
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
    </Modal>
  )
}

export function ProductFormModal(props: ProductFormModalProps) {
  if (props.mode === 'create') {
    return <CreateProductForm {...props} />
  }
  return <EditProductForm {...props} />
}
