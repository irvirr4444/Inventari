import type { Country } from './schemas/country.js'

export function productLabel(emri: string | null | undefined, kodi: string): string {
  const name = emri?.trim() ?? ''
  const code = kodi.trim()
  if (name && code) return `${name} (${code})`
  return name || code
}

export function countryLabel(country: Country): string {
  return country === 'XK' ? 'Kosove' : 'Shqiperi'
}

/** @deprecated Use countryLabel — kept as alias for backward compatibility */
export const countryHistoryLabel = countryLabel
