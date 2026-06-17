import * as React from 'react'

export function ConfirmModal(props: {
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
          <p className="muted confirm-message">{props.message}</p>
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
