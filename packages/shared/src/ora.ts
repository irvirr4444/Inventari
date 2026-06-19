const ORA_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/

export function normalizeOraInput(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return undefined
  const short = trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed
  return ORA_HH_MM.test(short) ? short : undefined
}

export function formatOraDisplay(ora: string | null | undefined): string {
  if (!ora) return ''
  const trimmed = ora.trim()
  if (!trimmed) return ''
  if (ORA_HH_MM.test(trimmed)) return trimmed
  const match = /^(\d{2}):(\d{2})/.exec(trimmed)
  return match ? `${match[1]}:${match[2]}` : trimmed
}
