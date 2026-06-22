import * as React from 'react'
import { Modal } from '../../components/Modal'
import { useMobileClient } from '../../hooks/useMobileClient'
import { BottomSheet } from '../../mobile/components/BottomSheet'

export function ShenimPopup(props: {
  open: boolean
  initialValue: string
  readOnly?: boolean
  stacked?: boolean
  onClose: () => void
  onSave: (value: string) => void
  onClear: () => void
}) {
  const isMobile = useMobileClient()
  const [draft, setDraft] = React.useState(props.initialValue)

  React.useEffect(() => {
    if (props.open) setDraft(props.initialValue)
  }, [props.open, props.initialValue])

  const hasExisting = Boolean(props.initialValue.trim())
  const readOnly = props.readOnly ?? false

  const handleSave = () => {
    props.onSave(draft.trim())
    props.onClose()
  }

  const handleClear = () => {
    props.onClear()
    props.onClose()
  }

  const body = (
    <div className="shenim-popup-body">
      <label className="label" htmlFor="shenim-popup-text">
        Shenim
      </label>
      <textarea
        id="shenim-popup-text"
        className="input shenim-popup-textarea"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Shenim per kete produkt (opsionale)"
        maxLength={200}
        rows={3}
        readOnly={readOnly}
        disabled={readOnly}
        onKeyDown={(e) => {
          if (readOnly || e.key !== 'Enter' || e.shiftKey) return
          e.preventDefault()
        }}
      />
    </div>
  )

  const editableFooter = (
    <div className="shenim-popup-footer">
      <button type="button" className="btn" onClick={props.onClose}>
        Anulo
      </button>
      {hasExisting ? (
        <button type="button" className="btn" onClick={handleClear}>
          Fshi shenimin
        </button>
      ) : null}
      <button type="button" className="btn primary" onClick={handleSave}>
        Ruaj
      </button>
    </div>
  )

  const readOnlyFooter = (
    <div className="shenim-popup-footer">
      <button type="button" className="btn primary" onClick={props.onClose}>
        Mbyll
      </button>
    </div>
  )

  const footer = readOnly ? readOnlyFooter : editableFooter

  if (isMobile) {
    return (
      <BottomSheet
        open={props.open}
        title="Shenim"
        onClose={props.onClose}
        footer={footer}
        onEnterConfirm={readOnly ? undefined : handleSave}
      >
        {body}
      </BottomSheet>
    )
  }

  return (
    <Modal
      open={props.open}
      title="Shenim"
      onClose={props.onClose}
      stacked={props.stacked}
      className="shenim-popup-modal"
      footer={footer}
      onEnterConfirm={readOnly ? undefined : handleSave}
    >
      {body}
    </Modal>
  )
}
