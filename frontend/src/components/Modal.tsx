import * as React from 'react'
import { createPortal } from 'react-dom'
import { useEnterToConfirm } from '../hooks/useEnterToConfirm'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import { useFocusModalOnOpen } from '../hooks/useFocusModalOnOpen'
import { handleOverlayDismiss } from '../lib/pointerDismissGuard'

type ModalProps = {
  open: boolean
  title: React.ReactNode
  onClose: () => void
  stacked?: boolean
  className?: string
  children: React.ReactNode
  footer?: React.ReactNode
  onEnterConfirm?: () => void
  enterConfirmDisabled?: boolean
}

export function Modal(props: ModalProps) {
  const contentRef = React.useRef<HTMLDivElement>(null)

  useEnterToConfirm(props.onEnterConfirm ?? (() => {}), {
    enabled: props.open && Boolean(props.onEnterConfirm),
    disabled: props.enterConfirmDisabled,
  })
  useEscapeToClose(props.onClose, { enabled: props.open })
  useFocusModalOnOpen(contentRef, props.open)

  if (!props.open) return null

  const modal = (
    <div
      className={props.stacked ? 'modal-overlay modal-overlay-stacked' : 'modal-overlay'}
      onClick={(e) => handleOverlayDismiss(e, props.onClose)}
    >
      <div
        ref={contentRef}
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

  if (typeof document === 'undefined') return modal
  return createPortal(modal, document.body)
}
