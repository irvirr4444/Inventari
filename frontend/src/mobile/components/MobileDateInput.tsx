import * as React from 'react'
import { InputClearButton } from '../../components/InputClearButton'
import { formatDisplayDate } from '../../lib/format'
import { DatePickerSheet } from './DatePickerSheet'

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

export function MobileDateInput(props: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  clearable?: boolean
  'aria-label'?: string
}) {
  const [open, setOpen] = React.useState(false)
  const label = props.placeholder ?? props['aria-label'] ?? 'Zgjedh daten'

  return (
    <>
      <button
        type="button"
        className="mobile-tap-field mobile-date-field"
        disabled={props.disabled}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className={props.value ? 'date-input-value' : 'date-input-placeholder'}>
          {props.value ? formatDisplayDate(props.value) : label}
        </span>
        {props.clearable ? (
          <span className="date-input-trailing-slot">
            {props.value ? (
              <InputClearButton
                className="date-input-trailing-btn"
                onClick={() => props.onChange('')}
              />
            ) : (
              <CalendarIcon />
            )}
          </span>
        ) : (
          <CalendarIcon />
        )}
      </button>

      <DatePickerSheet
        open={open}
        value={props.value}
        title={label}
        clearable={props.clearable}
        onClose={() => setOpen(false)}
        onSelect={props.onChange}
      />
    </>
  )
}
