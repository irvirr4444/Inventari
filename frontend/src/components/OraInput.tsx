import * as React from 'react'
import { createPortal } from 'react-dom'
import { formatDisplayTime } from '../lib/actionMeta'
import { useMobileClient } from '../hooks/useMobileClient'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import { TimePickerSheet } from '../mobile/components/TimePickerSheet'
import { TimePickerPopover } from './TimePickerPopover'
import { InputClearButton } from './InputClearButton'
import { parseOraDigits } from './timePickerUtils'

const POPOVER_ESTIMATED_HEIGHT = 340

type PopoverPosition = {
  top: number
  left: number
  width: number
}

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

type OraInputProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'onChange' | 'type' | 'children'
> & {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  wrapperClassName?: string
  variant?: 'default' | 'compact'
  clearable?: boolean
}

export function OraInput({
  value,
  onChange,
  className,
  wrapperClassName,
  placeholder = 'Zgjedh orën',
  disabled,
  id,
  variant = 'default',
  clearable,
  ...rest
}: OraInputProps) {
  const isMobile = useMobileClient()
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const popoverRef = React.useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = React.useState(false)
  const [popoverPos, setPopoverPos] = React.useState<PopoverPosition | null>(null)

  const displayValue = formatDisplayTime(value)
  const [h1, h2, m1, m2] = parseOraDigits(value)
  const isCompact = variant === 'compact'
  const emptyDigit = '–'

  const repositionPopover = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const width = popoverRef.current?.offsetWidth ?? 252
    const height = popoverRef.current?.offsetHeight ?? POPOVER_ESTIMATED_HEIGHT
    setPopoverPos(computePopoverPosition(trigger, width, height))
  }, [])

  const closePicker = React.useCallback(() => {
    setOpen(false)
  }, [])

  useEscapeToClose(closePicker, { enabled: open })

  const openPicker = React.useCallback(() => {
    if (disabled) return
    setOpen(true)
  }, [disabled])

  React.useLayoutEffect(() => {
    if (!open || isMobile) return
    repositionPopover()
    const raf = requestAnimationFrame(repositionPopover)
    return () => cancelAnimationFrame(raf)
  }, [open, value, repositionPopover, isMobile])

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

  const popover = open && !isMobile ? (
    <div
      ref={popoverRef}
      className="time-picker-popover time-picker-popover-portal"
      role="dialog"
      aria-label="Zgjedh orën"
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
        key={value || '__empty__'}
        value={value}
        onConfirm={(next) => {
          onChange(next)
          closePicker()
        }}
        onClear={() => {
          onChange('')
          closePicker()
        }}
      />
    </div>
  ) : null

  return (
    <div
      ref={rootRef}
      className={`time-input${isCompact ? ' ora-compact-input' : ''}${wrapperClassName ? ` ${wrapperClassName}` : ''}${open ? ' open' : ''}`}
    >
      <button
        {...rest}
        ref={triggerRef}
        id={id}
        type="button"
        className={
          isCompact
            ? `ora-compact-trigger${className ? ` ${className}` : ''}`
            : `time-input-trigger${className ? ` ${className}` : ' input'}`
        }
        disabled={disabled}
        aria-label="Zgjedh orën"
        aria-expanded={open}
        onClick={openPicker}
      >
        {isCompact ? (
          <>
            <span className="ora-digit-box">{h1 || emptyDigit}</span>
            <span className="ora-digit-box">{h2 || emptyDigit}</span>
            <span className="ora-compact-sep" aria-hidden="true">
              :
            </span>
            <span className="ora-digit-box">{m1 || emptyDigit}</span>
            <span className="ora-digit-box">{m2 || emptyDigit}</span>
          </>
        ) : (
          <>
            <span className={displayValue ? 'time-input-value' : 'time-input-placeholder'}>
              {displayValue || placeholder}
            </span>
            {clearable ? (
              <span className="time-input-trailing-slot">
                {displayValue ? (
                  <InputClearButton
                    className="time-input-trailing-btn"
                    onClick={() => onChange('')}
                  />
                ) : (
                  <ClockIcon />
                )}
              </span>
            ) : (
              <ClockIcon />
            )}
          </>
        )}
      </button>

      {popover && createPortal(popover, document.body)}

      {isMobile ? (
        <TimePickerSheet
          open={open}
          value={value}
          title={placeholder}
          onClose={closePicker}
          onChange={onChange}
        />
      ) : null}
    </div>
  )
}
