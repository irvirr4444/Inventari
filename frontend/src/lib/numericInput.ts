export function formatNumericInputValue(value: number | string | null | undefined): string {
  if (value === '' || value === null || value === undefined) return ''
  if (value === 0 || value === '0') return ''
  return String(value)
}

export function sanitizeNumericInputChange(raw: string): string {
  if (raw.startsWith('-')) return ''
  return raw
}
