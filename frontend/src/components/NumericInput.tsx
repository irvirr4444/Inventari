import * as React from 'react'
import { formatNumericInputValue, sanitizeNumericInputChange } from '../lib/numericInput'

type NumericInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: number | string
  onChange: (value: string) => void
}

export function NumericInput({
  value,
  onChange,
  onFocus,
  className,
  placeholder = '0',
  ...rest
}: NumericInputProps) {
  return (
    <input
      {...rest}
      type="number"
      className={className}
      placeholder={placeholder}
      value={formatNumericInputValue(value)}
      onChange={(e) => onChange(sanitizeNumericInputChange(e.target.value))}
      onFocus={(e) => {
        if (e.target.value !== '') e.target.select()
        onFocus?.(e)
      }}
    />
  )
}
