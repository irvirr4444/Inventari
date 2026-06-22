import * as React from 'react'
import {
  formatNumericInputValue,
  numericInputOptionsFromStep,
  sanitizeNumericInputChange,
  type NumericInputFormatOptions,
} from '../lib/numericInput'
import { InputClearButton } from './InputClearButton'

type NumericInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'inputMode'
> & {
  value: number | string
  onChange: (value: string) => void
  clearable?: boolean
  /** When false, zero is shown (e.g. filter min/max). Default true for form fields. */
  hideZero?: boolean
}

export function NumericInput({
  value,
  onChange,
  onFocus,
  className,
  placeholder = '0',
  clearable,
  hideZero = true,
  step,
  ...rest
}: NumericInputProps) {
  const formatOptions = React.useMemo<NumericInputFormatOptions>(
    () => ({ ...numericInputOptionsFromStep(step), hideZero }),
    [step, hideZero],
  )
  const displayValue = formatNumericInputValue(value, formatOptions)
  const hasValue = displayValue !== ''

  const input = (
    <input
      {...rest}
      type="text"
      inputMode={formatOptions.allowDecimals === false ? 'numeric' : 'decimal'}
      autoComplete="off"
      className={
        clearable
          ? `clearable-field__control numeric-input ${className ?? ''}`.trim()
          : `numeric-input ${className ?? ''}`.trim()
      }
      placeholder={placeholder}
      value={displayValue}
      onChange={(e) => onChange(sanitizeNumericInputChange(e.target.value, formatOptions))}
      onFocus={(e) => {
        if (e.target.value !== '') e.target.select()
        onFocus?.(e)
      }}
    />
  )

  if (!clearable) return input

  return (
    <span className={`clearable-field${hasValue ? ' clearable-field--has-value' : ''}`}>
      {input}
      <InputClearButton className="clearable-field__clear" onClick={() => onChange('')} />
    </span>
  )
}
