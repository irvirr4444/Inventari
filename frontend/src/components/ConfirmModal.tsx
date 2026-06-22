import * as React from 'react'
import { createPortal } from 'react-dom'
import { useEnterToConfirm } from '../hooks/useEnterToConfirm'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import { useFocusModalOnOpen } from '../hooks/useFocusModalOnOpen'
import { handleOverlayDismiss } from '../lib/pointerDismissGuard'

export function ConfirmModal(props: {
  title: string
  message: React.ReactNode
  confirmLabel: string
  tone: 'primary' | 'success' | 'danger'
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const contentRef = React.useRef<HTMLDivElement>(null)

  useEnterToConfirm(props.onConfirm, { disabled: props.loading })
  useEscapeToClose(props.onCancel, { disabled: props.loading })
  useFocusModalOnOpen(contentRef, true)

  const modal = (
    <div
      className="modal-overlay modal-overlay-stacked"
      onClick={(e) => !props.loading && handleOverlayDismiss(e, props.onCancel)}
    >
      <div
        ref={contentRef}
        className="modal-content confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-header">
          <h3>{props.title}</h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={props.onCancel}
            disabled={props.loading}
            aria-label="Mbyll"
          >
            ×
          </button>
        </div>
        <p className="muted confirm-message">{props.message}</p>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="btn"
            onClick={props.onCancel}
            disabled={props.loading}
          >
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

  if (typeof document === 'undefined') return modal
  return createPortal(modal, document.body)
}
