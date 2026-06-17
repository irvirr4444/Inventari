import * as React from 'react'
import { createPortal } from 'react-dom'
import { formatDisplayDate } from '../lib/format'

const MONTHS_SQ = [
  'Janar',
  'Shkurt',
  'Mars',
  'Prill',
  'Maj',
  'Qershor',
  'Korrik',
  'Gusht',
  'Shtator',
  'Tetor',
  'Nentor',
  'Dhjetor',
] as const

const WEEKDAYS_SQ = ['H', 'M', 'M', 'E', 'P', 'Sh', 'D'] as const

const POPOVER_ESTIMATED_HEIGHT = 360

function isoToDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

function toIsoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function buildMonthGrid(viewMonth: Date) {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - startOffset)

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return {
      date: d,
      iso: toIsoDate(d),
      inMonth: d.getMonth() === month,
    }
  })
}

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
  const [viewMonth, setViewMonth] = React.useState(
    () => isoToDate(props.value) ?? new Date(),
  )
  const [popoverPos, setPopoverPos] = React.useState<PopoverPosition | null>(null)

  const selected = isoToDate(props.value)
  const today = React.useMemo(() => new Date(), [])
  const grid = React.useMemo(() => buildMonthGrid(viewMonth), [viewMonth])

  const repositionPopover = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const height = popoverRef.current?.offsetHeight ?? POPOVER_ESTIMATED_HEIGHT
    setPopoverPos(computePopoverPosition(trigger, height))
  }, [])

  const openPicker = React.useCallback(() => {
    if (props.disabled) return
    setViewMonth(isoToDate(props.value) ?? new Date())
    setOpen(true)
  }, [props.disabled, props.value])

  React.useLayoutEffect(() => {
    if (!open) return
    repositionPopover()
    const raf = requestAnimationFrame(repositionPopover)
    return () => cancelAnimationFrame(raf)
  }, [open, viewMonth, repositionPopover])

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

  const pickDate = (iso: string) => {
    props.onChange(iso)
    setOpen(false)
  }

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
      <div className="date-picker-header">
        <button
          type="button"
          className="date-picker-nav"
          aria-label="Muaji i meparshem"
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
        >
          ‹
        </button>
        <span className="date-picker-title">
          {MONTHS_SQ[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </span>
        <button
          type="button"
          className="date-picker-nav"
          aria-label="Muaji tjeter"
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
        >
          ›
        </button>
      </div>

      <div className="date-picker-weekdays">
        {WEEKDAYS_SQ.map((day, i) => (
          <span key={`${day}-${i}`} className="date-picker-weekday">
            {day}
          </span>
        ))}
      </div>

      <div className="date-picker-grid">
        {grid.map((cell) => {
          const isSelected = selected ? sameDay(cell.date, selected) : false
          const isToday = sameDay(cell.date, today)
          return (
            <button
              key={cell.iso}
              type="button"
              className={[
                'date-picker-day',
                !cell.inMonth && 'muted',
                isSelected && 'selected',
                isToday && 'today',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => pickDate(cell.iso)}
            >
              {cell.date.getDate()}
            </button>
          )
        })}
      </div>

      <div className="date-picker-footer">
        <button
          type="button"
          className="date-picker-footer-btn"
          onClick={() => {
            props.onChange('')
            setOpen(false)
          }}
        >
          Pastro
        </button>
        <button
          type="button"
          className="date-picker-footer-btn primary"
          onClick={() => pickDate(toIsoDate(today))}
        >
          Sot
        </button>
      </div>
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
