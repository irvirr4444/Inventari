import * as React from 'react'
import { createPortal } from 'react-dom'
import { formatDisplayDate } from '../lib/format'
import { DatePickerCalendar } from './DatePickerCalendar'

const POPOVER_ESTIMATED_HEIGHT = 360

type PopoverPosition = {
  top: number
  left: number
  width: number
}

function computePopoverPosition(trigger: HTMLElement, popoverHeight: number): PopoverPosition {
  const rect = trigger.getBoundingClientRect()
  const width = Math.min(300, window.innerWidth - 32)
  let left = rect.left
  if (left + width > window.innerWidth - 16) {
    left = window.innerWidth - 16 - width
  }
  left = Math.max(16, left)

  const gap = 6
  const spaceBelow = window.innerHeight - rect.bottom - gap
  const spaceAbove = rect.top - gap
  let top = rect.bottom + gap
  if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
    top = rect.top - gap - popoverHeight
  }
  top = Math.max(8, Math.min(top, window.innerHeight - popoverHeight - 8))

  return { top, left, width }
}

export function DateInput(props: {
  value: string
  onChange: (value: string) => void
  style?: React.CSSProperties
  className?: string
  placeholder?: string
  disabled?: boolean
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const popoverRef = React.useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = React.useState(false)
  const [popoverPos, setPopoverPos] = React.useState<PopoverPosition | null>(null)

  const repositionPopover = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const height = popoverRef.current?.offsetHeight ?? POPOVER_ESTIMATED_HEIGHT
    setPopoverPos(computePopoverPosition(trigger, height))
  }, [])

  const openPicker = React.useCallback(() => {
    if (props.disabled) return
    setOpen(true)
  }, [props.disabled])

  const closePicker = React.useCallback(() => {
    setOpen(false)
  }, [])

  React.useLayoutEffect(() => {
    if (!open) return
    repositionPopover()
    const raf = requestAnimationFrame(repositionPopover)
    return () => cancelAnimationFrame(raf)
  }, [open, props.value, repositionPopover])

  React.useEffect(() => {
    if (!open) return

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onReposition = () => repositionPopover()

    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, repositionPopover])

  const popover = open ? (
    <div
      ref={popoverRef}
      className="date-picker-popover date-picker-popover-portal"
      role="dialog"
      aria-label="Kalendari"
      style={
        popoverPos
          ? {
              top: popoverPos.top,
              left: popoverPos.left,
              width: popoverPos.width,
            }
          : undefined
      }
    >
      <DatePickerCalendar
        value={props.value}
        onChange={(iso) => {
          props.onChange(iso)
          closePicker()
        }}
      />
    </div>
  ) : null

  return (
    <div
      ref={rootRef}
      className={`date-input${props.className ? ` ${props.className}` : ''}${open ? ' open' : ''}`}
      style={props.style}
    >
      <button
        ref={triggerRef}
        type="button"
        className="date-input-trigger input"
        disabled={props.disabled}
        aria-label="Zgjedh daten"
        aria-expanded={open}
        onClick={openPicker}
      >
        <span className={props.value ? 'date-input-value' : 'date-input-placeholder'}>
          {props.value ? formatDisplayDate(props.value) : props.placeholder ?? 'Zgjedh daten'}
        </span>
        <svg
          className="date-input-icon"
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
        </svg>
      </button>

      {popover && createPortal(popover, document.body)}
    </div>
  )
}
