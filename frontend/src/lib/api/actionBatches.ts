import type { Country } from '../country'
import type { Veprimi } from './actions'
import { http } from './http'

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

export type { Veprimi }
