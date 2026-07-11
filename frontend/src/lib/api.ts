import type { GroupedSummaryResult, SummaryByCountry, SummaryGroupBy } from '@inventari/shared'
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

export type ProductListItem = {
  id: string
  kodi: string
  emri: string
}

export type DynamicProdukti = ProductListItem & {
  njesi_matese?: string | null
  stock: Array<{ lokacioni_id: string; sasia: number }>
  created_at?: string
  updated_at?: string
}

export function stockRecord(product: DynamicProdukti): Record<string, number> {
  return Object.fromEntries(product.stock.map((s) => [s.lokacioni_id, s.sasia]))
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

export async function listDynamicProducts(opts: {
  search?: string
}): Promise<DynamicProdukti[]> {
  const qs = new URLSearchParams()
  if (opts.search) qs.set('search', opts.search)
  const res = await http<{ data: DynamicProdukti[] }>(`/products?${qs.toString()}`)
  return res.data
}

export async function createProduct(input: {
  kodi: string
  emri: string
  gjendje_kosove?: number
  gjendje_shqiperi?: number
  njesi_matese?: string | null
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

export async function updateDynamicProduct(
  id: string,
  patch: {
    kodi?: string
    emri?: string
    njesi_matese?: string | null
    stock?: Array<{ lokacioni_id: string; sasia: number }>
  },
): Promise<DynamicProdukti> {
  const res = await http<{ data: DynamicProdukti }>(`/products/${id}`, {
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
  items: Array<{ kodi_produktit: string; cmimi_njesi: number; sasia: number; shenim?: string }>
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

export async function createDynamicActionBatch(input: {
  lokacioni_id: string
  destination_lokacioni_id?: string
  lloji: 'Hyrje' | 'Dalje' | 'Transfer'
  data?: string
  ora?: string
  pershkrimi?: string
  items: Array<{ kodi_produktit: string; cmimi_njesi: number; sasia: number; shenim?: string }>
}): Promise<{
  data: Veprimi[]
  meta?: {
    transfer?: boolean
    transfer_count?: number
  }
}> {
  return http<{
    data: Veprimi[]
    meta?: {
      transfer?: boolean
      transfer_count?: number
    }
  }>(`/actions`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type ActionBatchMatchedItem = {
  id: string
  productLabel: string
  shenim: string
}

export type ActionBatch = {
  id: string
  lloji: 'Hyrje' | 'Dalje' | 'Transfer'
  shteti: Country
  destination_shteti?: Country
  lokacioni_id?: string
  destination_lokacioni_id?: string
  lokacioni_emri?: string
  destination_lokacioni_emri?: string
  flag_emoji?: string
  destination_flag_emoji?: string
  data: string
  ora?: string | null
  pershkrimi?: string | null
  totali: number
  created_by_user_id?: string
  created_at: string
  item_count: number
  matched_items?: ActionBatchMatchedItem[]
}

export type HistoryActionItem = {
  id: string
  kodi_produktit: string
  emri_produktit: string
  cmimi_njesi: number
  sasia: number
  totali: number
  shenim?: string | null
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
  shenim?: string
  kodiProduktit?: string
  createdByUserId?: string
}): Promise<{ actions: ActionBatch[]; total: number }> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.lloji) qs.set('lloji', params.lloji)
  if (params.shteti) qs.set('shteti', params.shteti)
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params.dateTo) qs.set('dateTo', params.dateTo)
  if (params.shenim?.trim()) qs.set('shenim', params.shenim.trim())
  if (params.kodiProduktit?.trim()) qs.set('kodiProduktit', params.kodiProduktit.trim())
  if (params.createdByUserId?.trim()) qs.set('createdByUserId', params.createdByUserId.trim())
  return http<{ actions: ActionBatch[]; total: number; creator_user_ids?: string[] }>(
    `/action-batches?${qs.toString()}`,
  )
}

export async function listActionBatchCreatorUserIds(): Promise<string[]> {
  const res = await http<{ creator_user_ids?: string[] }>(`/action-batches?page=1&limit=1`)
  return res.creator_user_ids ?? []
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
    lokacioni_id?: string
    destination_lokacioni_id?: string
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
    shenim?: string | null
  },
): Promise<{ batch_id?: string }> {
  const res = await http<{ ok: true; batch_id?: string }>(
    `/action-batches/${encodeURIComponent(batchId)}/items/${itemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return { batch_id: res.batch_id }
}

export async function createActionBatchItem(
  batchId: string,
  payload: {
    kodi_produktit: string
    cmimi_njesi: number
    sasia: number
    shenim?: string
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
export type {
  GroupedSummaryResult,
  GroupedSummaryRow,
  SummaryGroupBy,
} from '@inventari/shared'

export async function analyticsSummary(opts: {
  from: string
  to: string
  groupBy?: SummaryGroupBy
}): Promise<SummaryByCountry | GroupedSummaryResult> {
  const qs = new URLSearchParams(opts)
  const res = await http<{ data: SummaryByCountry | GroupedSummaryResult }>(
    `/analytics/summary?${qs.toString()}`,
  )
  return res.data
}

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

