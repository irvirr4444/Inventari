import * as React from 'react'
import { createPortal } from 'react-dom'
import { formatDisplayTime } from '../lib/actionMeta'
import { useMobileClient } from '../hooks/useMobileClient'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import { TimePickerSheet } from '../mobile/components/TimePickerSheet'
import { TimePickerPopover } from './TimePickerPopover'
import { InputClearButton } from './InputClearButton'

const POPOVER_ESTIMATED_HEIGHT = 380

type PopoverPosition = {
  top: number
  left: number
  width: number
}

type RangeEndpoint = 'from' | 'to'

function computePopoverPosition(
  trigger: HTMLElement,
  popoverWidth: number,
  popoverHeight: number,
): PopoverPosition {
  const rect = trigger.getBoundingClientRect()
  const width = popoverWidth
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

function ClockIcon() {
  return (
    <svg
      className="time-input-icon"
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
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
  wrapperClassName?: string
  triggerRef: React.RefObject<HTMLButtonElement | null>
  onOpen: () => void
  onClear: () => void
}) {
  const displayValue = formatDisplayTime(props.value)

  return (
    <div
      className={`time-input${props.wrapperClassName ? ` ${props.wrapperClassName}` : ''}${props.active ? ' open' : ''}`}
    >
      <button
        ref={props.triggerRef}
        type="button"
        className={`time-input-trigger input time-range-input-trigger${props.active ? ' active' : ''}${props.className ? ` ${props.className}` : ''}`}
        disabled={props.disabled}
        aria-label={props.placeholder}
        aria-expanded={props.active}
        onClick={props.onOpen}
      >
        <span className={displayValue ? 'time-input-value' : 'time-input-placeholder'}>
          {displayValue || props.placeholder}
        </span>
        {props.clearable ? (
          <span className="time-input-trailing-slot">
            {displayValue ? (
              <InputClearButton className="time-input-trailing-btn" onClick={props.onClear} />
            ) : (
              <ClockIcon />
            )}
          </span>
        ) : (
          <ClockIcon />
        )}
      </button>
    </div>
  )
}

export type OraRangeChangeHandler = (value: string) => boolean | void

function applyOraRangeChange(handler: OraRangeChangeHandler, value: string): boolean {
  return handler(value) !== false
}

export function OraRangeInput(props: {
  from: string
  to: string
  onFromChange: OraRangeChangeHandler
  onToChange: OraRangeChangeHandler
  className?: string
  fromClassName?: string
  toClassName?: string
  fromWrapperClassName?: string
  toWrapperClassName?: string
  fromPlaceholder?: string
  toPlaceholder?: string
  disabled?: boolean
  clearable?: boolean
}) {
  const isMobile = useMobileClient()
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const fromTriggerRef = React.useRef<HTMLButtonElement | null>(null)
  const toTriggerRef = React.useRef<HTMLButtonElement | null>(null)
  const popoverRef = React.useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = React.useState(false)
  const [activeEndpoint, setActiveEndpoint] = React.useState<RangeEndpoint>('from')
  const [popoverPos, setPopoverPos] = React.useState<PopoverPosition | null>(null)

  const activeValue = activeEndpoint === 'from' ? props.from : props.to

  const repositionPopover = React.useCallback(() => {
    const trigger =
      activeEndpoint === 'from' ? fromTriggerRef.current : toTriggerRef.current
    if (!trigger) return
    const width = popoverRef.current?.offsetWidth ?? 252
    const height = popoverRef.current?.offsetHeight ?? POPOVER_ESTIMATED_HEIGHT
    setPopoverPos(computePopoverPosition(trigger, width, height))
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

  useEscapeToClose(closePicker, { enabled: open && !isMobile })

  React.useLayoutEffect(() => {
    if (!open || isMobile) return
    repositionPopover()
    const raf = requestAnimationFrame(repositionPopover)
    return () => cancelAnimationFrame(raf)
  }, [open, activeValue, repositionPopover, isMobile])

  React.useEffect(() => {
    if (!open || isMobile) return

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
  }, [open, repositionPopover, isMobile])

  const confirmValue = (next: string) => {
    const accepted =
      activeEndpoint === 'from'
        ? applyOraRangeChange(props.onFromChange, next)
        : applyOraRangeChange(props.onToChange, next)
    if (accepted) closePicker()
  }

  const clearValue = () => {
    const accepted =
      activeEndpoint === 'from'
        ? applyOraRangeChange(props.onFromChange, '')
        : applyOraRangeChange(props.onToChange, '')
    if (accepted) closePicker()
  }

  const previewLabel =
    activeEndpoint === 'from' ? props.fromPlaceholder ?? 'Nga ora' : props.toPlaceholder ?? 'Deri ora'

  const popover = open && !isMobile ? (
    <div
      ref={popoverRef}
      className="time-picker-popover time-picker-popover-portal"
      role="dialog"
      aria-label="Zgjedh intervalin kohor"
      style={
        popoverPos
          ? {
              top: popoverPos.top,
              left: popoverPos.left,
            }
          : undefined
      }
    >
      <TimePickerPopover
        key={`${activeEndpoint}-${activeValue || '__empty__'}`}
        value={activeValue}
        previewLabel={previewLabel}
        rangeFrom={props.from}
        rangeTo={props.to}
        activeEndpoint={activeEndpoint}
        onConfirm={confirmValue}
        onClear={clearValue}
      />
    </div>
  ) : null

  return (
    <div
      ref={rootRef}
      className={`time-range-input${props.className ? ` ${props.className}` : ''}${open ? ' open' : ''}`}
    >
      <RangeTrigger
        value={props.from}
        placeholder={props.fromPlaceholder ?? 'Nga'}
        active={open && activeEndpoint === 'from'}
        clearable={props.clearable}
        disabled={props.disabled}
        className={props.fromClassName}
        wrapperClassName={props.fromWrapperClassName}
        triggerRef={fromTriggerRef}
        onOpen={() => openPicker('from')}
        onClear={() => props.onFromChange('')}
      />
      <RangeTrigger
        value={props.to}
        placeholder={props.toPlaceholder ?? 'Deri'}
        active={open && activeEndpoint === 'to'}
        clearable={props.clearable}
        disabled={props.disabled}
        className={props.toClassName}
        wrapperClassName={props.toWrapperClassName}
        triggerRef={toTriggerRef}
        onOpen={() => openPicker('to')}
        onClear={() => props.onToChange('')}
      />

      {popover && createPortal(popover, document.body)}

      {isMobile ? (
        <TimePickerSheet
          open={open}
          value={activeValue}
          title={previewLabel}
          rangeFrom={props.from}
          rangeTo={props.to}
          activeEndpoint={activeEndpoint}
          onClose={closePicker}
          onChange={confirmValue}
        />
      ) : null}
    </div>
  )
}
