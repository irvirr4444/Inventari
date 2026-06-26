import * as React from 'react'
import { HoverTooltip } from '../../components/HoverTooltip'
import { EditIcon, NoteIcon } from '../../components/icons'
import { useMobileClient } from '../../hooks/useMobileClient'
import { ShenimPopup } from './ShenimPopup'

export type ShenimNotify = (
  message: string,
  variant?: 'success' | 'default' | 'error',
) => void

function notifyShenimChange(
  notify: ShenimNotify | undefined,
  prev: string,
  next: string,
) {
  if (!notify) return
  const p = prev.trim()
  const n = next.trim()
  if (!p && n) notify('Shenimi u shtua.', 'success')
  else if (p && !n) notify('Shenimi u fshi.', 'success')
  else if (p && n && p !== n) notify('Shenimi u perditesua.', 'success')
}

export function ActionItemShenim(props: {
  value: string
  onChange?: (value: string) => void
  onNotify?: ShenimNotify
  readOnly?: boolean
  disabled?: boolean
  stacked?: boolean
  className?: string
  hideWhenEmpty?: boolean
  variant?: 'default' | 'review'
  icon?: 'note' | 'edit'
}) {
  const isMobile = useMobileClient()
  const [open, setOpen] = React.useState(false)
  const filled = Boolean(props.value.trim())
  const readOnly = props.readOnly ?? false
  const editable = Boolean(props.onChange) && !readOnly
  const variant = props.variant ?? 'default'
  const icon = props.icon ?? 'note'

  if (props.hideWhenEmpty && !filled) {
    return null
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (props.disabled) return
    if (editable) {
      setOpen(true)
      return
    }
    if (readOnly && filled) {
      setOpen(true)
    }
  }

  const inert = readOnly && !filled
  const noteText = filled ? props.value.trim() : ''
  const hoverLabel = (() => {
    if (isMobile || props.disabled) return undefined
    if (readOnly) return filled ? 'Shiko shenimin' : 'Ska shenim'
    if (inert) return undefined
    if (filled) return noteText
    if (editable) return 'Shenim per produktin'
    return undefined
  })()

  const button = (
    <button
      type="button"
      className={[
        'action-item-shenim-btn',
        filled ? 'has-note' : '',
        inert ? 'is-inert' : '',
        variant === 'review' ? 'action-item-shenim-btn--review' : '',
        props.className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      disabled={props.disabled || inert}
      aria-label={
        readOnly
          ? filled
            ? 'Shiko shenimin'
            : 'Ska shenim'
          : noteText
            ? `Shenim: ${noteText}`
            : 'Shenim per produktin'
      }
    >
      {icon === 'edit' ? <EditIcon /> : <NoteIcon filled={filled} />}
    </button>
  )

  return (
    <>
      {hoverLabel ? (
        <HoverTooltip label={hoverLabel} wrap={filled && editable}>
          {button}
        </HoverTooltip>
      ) : (
        button
      )}
      {open ? (
        <ShenimPopup
          open={open}
          initialValue={props.value}
          readOnly={readOnly && !editable}
          stacked={props.stacked}
          onClose={() => setOpen(false)}
          onSave={(value) => {
            const next = value.trim()
            notifyShenimChange(props.onNotify, props.value, next)
            props.onChange?.(next)
          }}
          onClear={() => {
            notifyShenimChange(props.onNotify, props.value, '')
            props.onChange?.('')
          }}
        />
      ) : null}
    </>
  )
}
