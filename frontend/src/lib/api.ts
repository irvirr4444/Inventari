import type { SummaryByCountry, SummaryByLocation } from '@inventari/shared'
import type { Country } from './country'
import { http, API_BASE } from './api/http'
export { login, logout, signup, loginWithGoogle, fetchSession } from './api/auth'
export type { SessionUser } from './auth/types'

export type Produkti = {
  id: string
  kodi: string
  emri: string
  gjendje_kosove: number
  gjendje_shqiperi: number
  created_at?: string
  updated_at?: string
}

export type Veprimi = {
  id: string
  lloji: 'Hyrje' | 'Dalje' | 'Transfer'
  data: string
  shteti: Country
  kodi_produktit: string
  cmimi_njesi: number
  sasia: number
  totali?: number
  created_at?: string
}


export async function currentSession(): Promise<boolean> {
  const res = await http<{ ok: boolean }>(`/session`)
  return res.ok
}

export async function listProducts(opts: {
  search?: string
}): Promise<Produkti[]> {
  const qs = new URLSearchParams()
  if (opts.search) qs.set('search', opts.search)
  const res = await http<{ data: Produkti[] }>(`/products?${qs.toString()}`)
  return res.data
}

export async function createProduct(input: {
  kodi: string
  emri: string
  gjendje_kosove?: number
  gjendje_shqiperi?: number
}): Promise<Produkti> {
  const res = await http<{ data: Produkti }>(`/products`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateProduct(
  id: string,
  patch: {
    kodi?: string
    emri?: string
    gjendje_kosove?: number
    gjendje_shqiperi?: number
  },
): Promise<Produkti> {
  const res = await http<{ data: Produkti }>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return res.data
}

export async function deleteProduct(id: string): Promise<void> {
  await http<{ ok: true }>(`/products/${id}`, {
    method: 'DELETE',
  })
}

export async function createActionBatch(input: {
  shteti: Country
  destination_shteti?: Country
  lloji: 'Hyrje' | 'Dalje' | 'Transfer'
  data?: string
  ora?: string
  pershkrimi?: string
  items: Array<{ kodi_produktit: string; cmimi_njesi: number; sasia: number }>
}): Promise<{
  data: Veprimi[]
  meta?: {
    mirrored_to_albania?: boolean
    mirrored_count?: number
    transfer?: boolean
    transfer_count?: number
    transfer_from?: Country
    transfer_to?: Country
  }
}> {
  return http<{
    data: Veprimi[]
    meta?: {
      mirrored_to_albania?: boolean
      mirrored_count?: number
      transfer?: boolean
      transfer_count?: number
      transfer_from?: Country
      transfer_to?: Country
    }
  }>(`/actions`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type ActionBatch = {
  id: string
  lloji: 'Hyrje' | 'Dalje' | 'Transfer'
  shteti: Country
  destination_shteti?: Country
  data: string
  ora?: string | null
  pershkrimi?: string | null
  totali: number
  created_at: string
  item_count: number
}

export type HistoryActionItem = {
  id: string
  kodi_produktit: string
  emri_produktit: string
  cmimi_njesi: number
  sasia: number
  totali: number
}

export type ActionBatchDetail = ActionBatch & {
  items: HistoryActionItem[]
  mirrored_to_albania?: boolean
}

export async function listActionBatches(params: {
  page?: number
  limit?: number
  lloji?: 'Hyrje' | 'Dalje' | 'Transfer'
  shteti?: Country
  dateFrom?: string
  dateTo?: string
}): Promise<{ actions: ActionBatch[]; total: number }> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.lloji) qs.set('lloji', params.lloji)
  if (params.shteti) qs.set('shteti', params.shteti)
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params.dateTo) qs.set('dateTo', params.dateTo)
  return http<{ actions: ActionBatch[]; total: number }>(`/action-batches?${qs.toString()}`)
}

export async function getActionBatch(id: string): Promise<ActionBatchDetail> {
  return http<ActionBatchDetail>(`/action-batches/${encodeURIComponent(id)}`)
}

export async function updateActionBatch(
  id: string,
  payload: {
    data?: string
    shteti?: Country
    destination_shteti?: Country
    ora?: string | null
    pershkrimi?: string | null
  },
): Promise<{ batch_id?: string }> {
  const res = await http<{ ok: true; batch_id?: string }>(
    `/action-batches/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return { batch_id: res.batch_id }
}

export async function updateActionBatchItem(
  batchId: string,
  itemId: string,
  payload: {
    kodi_produktit?: string
    cmimi_njesi?: number
    sasia?: number
  },
): Promise<void> {
  await http<{ ok: true }>(
    `/action-batches/${encodeURIComponent(batchId)}/items/${itemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function createActionBatchItem(
  batchId: string,
  payload: {
    kodi_produktit: string
    cmimi_njesi: number
    sasia: number
  },
): Promise<{ item_id: string }> {
  const res = await http<{ ok: true; item_id: string }>(
    `/action-batches/${encodeURIComponent(batchId)}/items`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return { item_id: res.item_id }
}

export async function deleteActionBatchItem(batchId: string, itemId: string): Promise<void> {
  await http<{ ok: true }>(
    `/action-batches/${encodeURIComponent(batchId)}/items/${itemId}`,
    {
      method: 'DELETE',
    },
  )
}

export async function deleteActionBatch(id: string): Promise<void> {
  await http<{ ok: true }>(`/action-batches/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export type { CountrySummary as CountrySummaryData, SummaryByCountry } from '@inventari/shared'

export async function analyticsSummary(opts: {
  from: string
  to: string
}): Promise<SummaryByCountry | SummaryByLocation> {
  const qs = new URLSearchParams(opts)
  const res = await http<{ data: SummaryByCountry }>(`/analytics/summary?${qs.toString()}`)
  return res.data
}

export function exportUrl(
  format: 'csv' | 'xlsx',
  opts: { shteti?: Country; from?: string; to?: string; lloji?: 'Hyrje' | 'Dalje' },
) {
  const qs = new URLSearchParams()
  if (opts.shteti) qs.set('shteti', opts.shteti)
  if (opts.from) qs.set('from', opts.from)
  if (opts.to) qs.set('to', opts.to)
  if (opts.lloji) qs.set('lloji', opts.lloji)
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

