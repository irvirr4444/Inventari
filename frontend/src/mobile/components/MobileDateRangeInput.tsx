import * as React from 'react'
import { InputClearButton } from '../../components/InputClearButton'
import { formatDisplayDate } from '../../lib/format'
import { DateRangePickerSheet } from './DateRangePickerSheet'

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

function MobileRangeField(props: {
  value: string
  label: string
  clearable?: boolean
  disabled?: boolean
  active: boolean
  onOpen: () => void
  onClear: () => void
}) {
  return (
    <button
      type="button"
      className={`mobile-tap-field mobile-date-field${props.active ? ' active' : ''}`}
      disabled={props.disabled}
      aria-label={props.label}
      aria-expanded={props.active}
      onClick={props.onOpen}
    >
      <span className={props.value ? 'date-input-value' : 'date-input-placeholder'}>
        {props.value ? formatDisplayDate(props.value) : props.label}
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

export function MobileDateRangeInput(props: {
  from: string
  to: string
  onRangeChange: (from: string, to: string) => void
  disabled?: boolean
  fromPlaceholder?: string
  toPlaceholder?: string
  clearable?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [activeEndpoint, setActiveEndpoint] = React.useState<'from' | 'to'>('from')

  const openPicker = (endpoint: 'from' | 'to') => {
    if (props.disabled) return
    setActiveEndpoint(endpoint)
    setOpen(true)
  }

  return (
    <>
      <div className={`mobile-date-range-input${props.className ? ` ${props.className}` : ''}`}>
        <MobileRangeField
          value={props.from}
          label={props.fromPlaceholder ?? 'Nga'}
          clearable={props.clearable}
          disabled={props.disabled}
          active={open && activeEndpoint === 'from'}
          onOpen={() => openPicker('from')}
          onClear={() => props.onRangeChange('', props.to)}
        />
        <MobileRangeField
          value={props.to}
          label={props.toPlaceholder ?? 'Deri'}
          clearable={props.clearable}
          disabled={props.disabled}
          active={open && activeEndpoint === 'to'}
          onOpen={() => openPicker('to')}
          onClear={() => props.onRangeChange(props.from, '')}
        />
      </div>

      <DateRangePickerSheet
        open={open}
        from={props.from}
        to={props.to}
        selectingEndpoint={activeEndpoint}
        title="Zgjedh periudhen"
        clearable={props.clearable}
        onClose={() => setOpen(false)}
        onRangeChange={props.onRangeChange}
      />
    </>
  )
}
