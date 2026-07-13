import type { SummaryGroupBy } from '@inventari/shared'
import type { Country } from '../country'
import { API_BASE } from './http'

export function exportUrl(
  format: 'csv' | 'xlsx',
  opts: {
    shteti?: Country
    from?: string
    to?: string
    lloji?: 'Hyrje' | 'Dalje'
    groupBy?: SummaryGroupBy
  },
) {
  const qs = new URLSearchParams()
  if (opts.shteti) qs.set('shteti', opts.shteti)
  if (opts.from) qs.set('from', opts.from)
  if (opts.to) qs.set('to', opts.to)
  if (opts.lloji) qs.set('lloji', opts.lloji)
  if (opts.groupBy) qs.set('groupBy', opts.groupBy)
  return `${API_BASE}/exports/actions.${format}?${qs.toString()}`
}

export function exportProductsUrl(opts: {
  sortKey: 'kodi' | 'emri' | 'gjendje_kosove' | 'gjendje_shqiperi'
  sortDirection: 'asc' | 'desc'
}): string {
  const qs = new URLSearchParams({
    sortKey: opts.sortKey,
    sortDirection: opts.sortDirection,
  })
  return `${API_BASE}/exports/products.xlsx?${qs.toString()}`
}

export function exportDynamicProductsUrl(): string {
  return `${API_BASE}/exports/products.xlsx?sortKey=kodi&sortDirection=asc`
}
