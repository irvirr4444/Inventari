import { normalizeOraInput } from '@inventari/shared'

export const TIME_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
export const TIME_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

export const TIME_QUICK_PICKS = [
  { id: 'now', label: 'Tani', value: null as string | null },
  { id: '09', label: '09:00', value: '09:00' },
  { id: '12', label: '12:00', value: '12:00' },
  { id: '17', label: '17:00', value: '17:00' },
] as const

export function currentOraValue(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function parseOraParts(value: string): { hour: string; minute: string } {
  const normalized = normalizeOraInput(value)
  if (normalized) {
    const [hour, minute] = normalized.split(':')
    return { hour, minute }
  }
  const [hour, minute] = currentOraValue().split(':')
  return { hour, minute }
}

export function combineOraParts(hour: string, minute: string): string {
  return `${hour}:${minute}`
}

export function parseOraDigits(value: string): [string, string, string, string] {
  const normalized = normalizeOraInput(value)
  if (!normalized) return ['', '', '', '']
  return [normalized[0], normalized[1], normalized[3], normalized[4]]
}
