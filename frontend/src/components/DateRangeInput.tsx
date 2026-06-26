import * as React from 'react'
import { createPortal } from 'react-dom'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import { formatDisplayDate } from '../lib/format'
import { DatePickerCalendar } from './DatePickerCalendar'
import { InputClearButton } from './InputClearButton'

const POPOVER_ESTIMATED_HEIGHT = 360

type PopoverPosition = {
  top: number
  left: number
  width: number
}

type RangeEndpoint = 'from' | 'to'

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

function CalendarIcon() {
  return (
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
  )
}

function RangeTrigger(props: {
  value: string
  placeholder: string
  active: boolean
  clearable?: boolean
  disabled?: boolean
  className?: string
  triggerRef: React.RefObject<HTMLButtonElement | null>
  onOpen: () => void
  onClear: () => void
}) {
  return (
    <button
      ref={props.triggerRef}
      type="button"
      className={`date-input-trigger input date-range-input-trigger${props.active ? ' active' : ''}${props.className ? ` ${props.className}` : ''}`}
      disabled={props.disabled}
      aria-label={props.placeholder}
      aria-expanded={props.active}
      onClick={props.onOpen}
    >
      <span className={props.value ? 'date-input-value' : 'date-input-placeholder'}>
        {props.value ? formatDisplayDate(props.value) : props.placeholder}
      </span>
      {props.clearable ? (
        <span className="date-input-trailing-slot">
          {props.value ? (
            <InputClearButton className="date-input-trailing-btn" onClick={props.onClear} />
          ) : (
            <CalendarIcon />
          )}
        </span>
      ) : (
        <CalendarIcon />
      )}
    </button>
  )
}

export function DateRangeInput(props: {
  from: string
  to: string
  onRangeChange: (from: string, to: string) => void
  className?: string
  fromClassName?: string
  toClassName?: string
  fromPlaceholder?: string
  toPlaceholder?: string
  disabled?: boolean
  clearable?: boolean
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const fromTriggerRef = React.useRef<HTMLButtonElement | null>(null)
  const toTriggerRef = React.useRef<HTMLButtonElement | null>(null)
  const popoverRef = React.useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = React.useState(false)
  const [activeEndpoint, setActiveEndpoint] = React.useState<RangeEndpoint>('from')
  const [popoverPos, setPopoverPos] = React.useState<PopoverPosition | null>(null)

  const repositionPopover = React.useCallback(() => {
    const trigger =
      activeEndpoint === 'from' ? fromTriggerRef.current : toTriggerRef.current
    if (!trigger) return
    const height = popoverRef.current?.offsetHeight ?? POPOVER_ESTIMATED_HEIGHT
    setPopoverPos(computePopoverPosition(trigger, height))
  }, [activeEndpoint])

  const closePicker = React.useCallback(() => {
    setOpen(false)
  }, [])

  const openPicker = React.useCallback(
    (endpoint: RangeEndpoint) => {
      if (props.disabled) return
      setActiveEndpoint(endpoint)
      setOpen(true)
    },
    [props.disabled],
  )

  useEscapeToClose(closePicker, { enabled: open })

  React.useLayoutEffect(() => {
    if (!open) return
    repositionPopover()
    const raf = requestAnimationFrame(repositionPopover)
    return () => cancelAnimationFrame(raf)
  }, [open, props.from, props.to, repositionPopover])

  React.useEffect(() => {
    if (!open) return

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    const onReposition = () => repositionPopover()

    document.addEventListener('mousedown', onDocMouseDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, repositionPopover])

  const handleRangeChange = (from: string, to: string) => {
    props.onRangeChange(from, to)
  }

  const popover = open ? (
    <div
      ref={popoverRef}
      className="date-picker-popover date-picker-popover-portal"
      role="dialog"
      aria-label="Kalendari i periudhes"
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
        clearable={props.clearable}
        rangeFrom={props.from}
        rangeTo={props.to}
        selectingEndpoint={activeEndpoint}
        onRangeChange={handleRangeChange}
        onRangeComplete={closePicker}
      />
    </div>
  ) : null

  return (
    <div
      ref={rootRef}
      className={`date-range-input${props.className ? ` ${props.className}` : ''}${open ? ' open' : ''}`}
    >
      <RangeTrigger
        value={props.from}
        placeholder={props.fromPlaceholder ?? 'Nga'}
        active={open && activeEndpoint === 'from'}
        clearable={props.clearable}
        disabled={props.disabled}
        className={props.fromClassName}
        triggerRef={fromTriggerRef}
        onOpen={() => openPicker('from')}
        onClear={() => props.onRangeChange('', props.to)}
      />
      <RangeTrigger
        value={props.to}
        placeholder={props.toPlaceholder ?? 'Deri'}
        active={open && activeEndpoint === 'to'}
        clearable={props.clearable}
        disabled={props.disabled}
        className={props.toClassName}
        triggerRef={toTriggerRef}
        onOpen={() => openPicker('to')}
        onClear={() => props.onRangeChange(props.from, '')}
      />
      {popover && createPortal(popover, document.body)}
    </div>
  )
}
