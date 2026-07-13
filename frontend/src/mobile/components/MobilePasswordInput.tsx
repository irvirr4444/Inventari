import * as React from 'react'

function PasswordHiddenIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function PasswordVisibleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.9 10.9 0 0 1 12 20C7 20 2.7 16.9 1 12a11.8 11.8 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.6 10.6 0 0 1 12 4c5 0 9.3 3.1 11 8a11.7 11.7 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
      <path d="M1 1l22 22" />
    </svg>
  )
}

export function MobilePasswordInput(props: {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minLength?: number
  required?: boolean
  disabled?: boolean
  autoComplete?: string
}) {
  const [visible, setVisible] = React.useState(false)

  return (
    <span className="mobile-password-field">
      <input
        id={props.id}
        className="mobile-input mobile-password-field__control"
        type={visible ? 'text' : 'password'}
        value={props.value}
        placeholder={props.placeholder}
        minLength={props.minLength}
        required={props.required}
        disabled={props.disabled}
        autoComplete={props.autoComplete}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <button
        type="button"
        className="mobile-password-field__toggle"
        disabled={props.disabled}
        aria-label={visible ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <PasswordVisibleIcon /> : <PasswordHiddenIcon />}
      </button>
    </span>
  )
}
