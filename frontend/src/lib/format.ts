import type { Country } from './country'
import {
  countryLabel as sharedCountryLabel,
  productLabel as sharedProductLabel,
  formatOraDisplay,
} from '@inventari/shared'
export type { CountrySummary, SummaryByCountry } from '@inventari/shared'

export { formatOraDisplay as formatDisplayTime }

export function formatDisplayDate(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return isoDate
  return `${match[3]}/${match[2]}/${match[1]}`
}

export function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtInt(n: number): string {
  return n.toLocaleString('en-US')
}

export function countryLabel(country: Country) {
  return sharedCountryLabel(country)
}

export function countryHistoryLabel(country: Country) {
  return sharedCountryLabel(country)
}

export function fmtEuro(n: number): string {
  return `${fmt(n)} €`
}

export function productCountLabel(count: number): string {
  return count === 1 ? '1 produkt' : `${count} produkte`
}

export function productLabel(emri: string, kodi: string): string {
  return sharedProductLabel(emri, kodi)
}

export function sortProductsByKodi<T extends { kodi: string }>(products: T[]): T[] {
  return [...products].sort((a, b) =>
    a.kodi.localeCompare(b.kodi, undefined, { sensitivity: 'base', numeric: true }),
  )
}
