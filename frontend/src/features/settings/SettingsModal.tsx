import * as React from 'react'
import { createPortal } from 'react-dom'
import { useEscapeToClose } from '../../hooks/useEscapeToClose'
import { useFocusModalOnOpen } from '../../hooks/useFocusModalOnOpen'
import { handleOverlayDismiss } from '../../lib/pointerDismissGuard'
import { UsersSettingsPanel } from './UsersSettingsPanel'
import { LocationsSettingsPanel } from './LocationsSettingsPanel'

export type SettingsTab = 'users' | 'locations'

export function SettingsModal(props: {
  open: boolean
  tab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
  onClose: () => void
}) {
  const contentRef = React.useRef<HTMLDivElement>(null)

  useEscapeToClose(props.onClose, { enabled: props.open })
  useFocusModalOnOpen(contentRef, props.open)

  if (!props.open) return null

  const modal = (
    <div
      className="modal-overlay settings-modal-overlay"
      onClick={(e) => handleOverlayDismiss(e, props.onClose)}
    >
      <div
        ref={contentRef}
        className="modal-content settings-modal modal-fluid"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn settings-modal-close-btn"
          onClick={props.onClose}
          aria-label="Mbyll"
        >
          ×
        </button>

        <div className="settings-modal-tabs" role="tablist" aria-label="Cilesimet">
          <button
            type="button"
            role="tab"
            aria-selected={props.tab === 'users'}
            className={`settings-modal-tab${props.tab === 'users' ? ' active' : ''}`}
            onClick={() => props.onTabChange('users')}
          >
            Përdoruesit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={props.tab === 'locations'}
            className={`settings-modal-tab${props.tab === 'locations' ? ' active' : ''}`}
            onClick={() => props.onTabChange('locations')}
          >
            Vendndodhjet
          </button>
        </div>

        <div className="settings-modal-body modal-fluid-scroll">
          <div key={props.tab} className="settings-modal-panel-shell">
            {props.tab === 'users' ? (
              <UsersSettingsPanel embedded />
            ) : (
              <LocationsSettingsPanel embedded />
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modal
  return createPortal(modal, document.body)
}
