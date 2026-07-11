import { z } from 'zod'
import { productLabel } from './format.js'

export const SummaryGroupBySchema = z.enum(['location', 'product', 'user'])
export type SummaryGroupBy = z.infer<typeof SummaryGroupBySchema>

export type CountrySummary = {
  in_qty: number
  in_value: number
  out_qty: number
  out_value: number
}

export type SummaryByCountry = {
  XK: CountrySummary
  AL: CountrySummary
}

export type SummaryByLocation = Record<string, CountrySummary>

export type GroupedSummaryRow = CountrySummary & {
  id: string
  label: string
}

export type GroupedSummaryResult = {
  groupBy: SummaryGroupBy
  rows: GroupedSummaryRow[]
}

type SummaryActionRow = {
  lloji: 'Hyrje' | 'Dalje'
  shteti: 'XK' | 'AL'
  sasia: number | string | null
  totali: number | string | null
}

type SummaryLocationRow = {
  lloji: 'Hyrje' | 'Dalje'
  lokacioni_id: string
  sasia: number | string | null
  totali: number | string | null
}

type SummaryProductRow = {
  lloji: 'Hyrje' | 'Dalje'
  kodi_produktit: string
  sasia: number | string | null
  totali: number | string | null
}

type SummaryUserRow = {
  lloji: 'Hyrje' | 'Dalje'
  created_by_user_id: string
  sasia: number | string | null
  totali: number | string | null
}

function emptyCountrySummary(): CountrySummary {
  return { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 }
}

function accumulateSummary(summary: CountrySummary, row: Pick<SummaryActionRow, 'lloji' | 'sasia' | 'totali'>) {
  const qty = Number(row.sasia ?? 0)
  const total = Number(row.totali ?? 0)
  if (row.lloji === 'Hyrje') {
    summary.in_qty += qty
    summary.in_value += total
  } else if (row.lloji === 'Dalje') {
    summary.out_qty += qty
    summary.out_value += total
  }
}

export function resolveActionCreatorUserId(
  row: {
    veprim_batch?:
      | { created_by_user_id?: string | null }
      | Array<{ created_by_user_id?: string | null }>
      | null
  },
  accountOwnerId: string,
): string {
  const batch = Array.isArray(row.veprim_batch) ? row.veprim_batch[0] : row.veprim_batch
  return batch?.created_by_user_id ?? accountOwnerId
}

export function buildSummaryByCountry(rows: SummaryActionRow[]): SummaryByCountry {
  const summaries: SummaryByCountry = {
    XK: emptyCountrySummary(),
    AL: emptyCountrySummary(),
  }

  for (const row of rows) {
    if (row.shteti !== 'XK' && row.shteti !== 'AL') continue
    accumulateSummary(summaries[row.shteti], row)
  }

  return summaries
}

export function buildSummaryByLocation(
  rows: SummaryLocationRow[],
  lokacioniIds: string[],
): SummaryByLocation {
  const summaries: SummaryByLocation = {}
  for (const id of lokacioniIds) {
    summaries[id] = emptyCountrySummary()
  }

  for (const row of rows) {
    if (!row.lokacioni_id || !summaries[row.lokacioni_id]) continue
    accumulateSummary(summaries[row.lokacioni_id], row)
  }

  return summaries
}

export function buildSummaryByProduct(
  rows: SummaryProductRow[],
  products: Array<{ kodi: string; emri: string }>,
): GroupedSummaryRow[] {
  const summaries = new Map<string, CountrySummary>()
  const labels = new Map(products.map((p) => [p.kodi, productLabel(p.emri, p.kodi)]))

  for (const row of rows) {
    const key = row.kodi_produktit
    if (!key) continue
    const summary = summaries.get(key) ?? emptyCountrySummary()
    accumulateSummary(summary, row)
    summaries.set(key, summary)
    if (!labels.has(key)) labels.set(key, key)
  }

  return [...summaries.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base', numeric: true }))
    .map(([id, summary]) => ({
      id,
      label: labels.get(id) ?? id,
      ...summary,
    }))
}

export function buildSummaryByUser(
  rows: SummaryUserRow[],
  users: Array<{ id: string; emri: string | null; email: string | null }>,
): GroupedSummaryRow[] {
  const summaries = new Map<string, CountrySummary>()
  const labels = new Map(
    users.map((u) => [u.id, u.emri?.trim() || u.email?.trim() || u.id]),
  )

  for (const row of rows) {
    const key = row.created_by_user_id
    if (!key) continue
    const summary = summaries.get(key) ?? emptyCountrySummary()
    accumulateSummary(summary, row)
    summaries.set(key, summary)
    if (!labels.has(key)) labels.set(key, key)
  }

  return [...summaries.entries()]
    .sort((a, b) =>
      (labels.get(a[0]) ?? a[0]).localeCompare(labels.get(b[0]) ?? b[0], undefined, {
        sensitivity: 'base',
        numeric: true,
      }),
    )
    .map(([id, summary]) => ({
      id,
      label: labels.get(id) ?? id,
      ...summary,
    }))
}

export function buildGroupedSummaryRows(
  groupBy: SummaryGroupBy,
  input: {
    locationRows: SummaryLocationRow[]
    productRows: SummaryProductRow[]
    userRows: SummaryUserRow[]
    locationIds: string[]
    locations: Array<{ id: string; emri: string }>
    products: Array<{ kodi: string; emri: string }>
    users: Array<{ id: string; emri: string | null; email: string | null }>
  },
): GroupedSummaryRow[] {
  if (groupBy === 'location') {
    const byLocation = buildSummaryByLocation(input.locationRows, input.locationIds)
    return input.locations.map((loc) => ({
      id: loc.id,
      label: loc.emri,
      ...(byLocation[loc.id] ?? emptyCountrySummary()),
    }))
  }

  if (groupBy === 'product') {
    return buildSummaryByProduct(input.productRows, input.products)
  }

  return buildSummaryByUser(input.userRows, input.users)
}
