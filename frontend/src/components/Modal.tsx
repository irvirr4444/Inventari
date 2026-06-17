import * as React from 'react'

type ModalProps = {
  open: boolean
  title: React.ReactNode
  onClose: () => void
  stacked?: boolean
  className?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function Modal(props: ModalProps) {
  if (!props.open) return null

  return (
    <div
      className={props.stacked ? 'modal-overlay modal-overlay-stacked' : 'modal-overlay'}
      onClick={props.onClose}
    >
      <div
        className={props.className ? `modal-content ${props.className}` : 'modal-content'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ marginBottom: 18 }}>
          <h3>{props.title}</h3>
          <div className="spacer" />
          <button
            type="button"
            className="modal-close-btn"
            onClick={props.onClose}
            aria-label="Mbyll"
          >
            ×
          </button>
        </div>
        {props.children}
        {props.footer}
      </div>
    </div>
  )
}
