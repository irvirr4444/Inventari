import type { SupabaseClient } from '@supabase/supabase-js'
import type { Country } from '@inventari/shared'
import { mapSupabaseError } from '../errors.js'

export type VeprimBatchRow = {
  id: string
  lloji: string
  data: string
  shteti: Country
  destination_shteti: Country | null
  lokacioni_id: string | null
  destination_lokacioni_id: string | null
  ora: string | null
  pershkrimi: string | null
  pronari_id: string
  created_at: string
  updated_at: string
}

export async function insertVeprimBatch(
  supabase: SupabaseClient,
  tenantId: string,
  input: {
    lloji: string
    data?: string
    shteti: Country
    destination_shteti?: Country | null
    lokacioni_id?: string | null
    destination_lokacioni_id?: string | null
    ora?: string | null
    pershkrimi?: string | null
  },
): Promise<string> {
  const { data, error } = await supabase
    .from('veprim_batch')
    .insert({
      pronari_id: tenantId,
      lloji: input.lloji,
      data: input.data,
      shteti: input.shteti,
      destination_shteti: input.destination_shteti ?? null,
      lokacioni_id: input.lokacioni_id ?? null,
      destination_lokacioni_id: input.destination_lokacioni_id ?? null,
      ora: input.ora ?? null,
      pershkrimi: input.pershkrimi ?? null,
    })
    .select('id')
    .single()

  if (error) throw mapSupabaseError(error)
  return data.id as string
}

export async function listVeprimBatches(
  supabase: SupabaseClient,
  tenantId: string,
  query: { from?: string; to?: string; limit?: number },
): Promise<VeprimBatchRow[]> {
  let q = supabase
    .from('veprim_batch')
    .select('*')
    .eq('pronari_id', tenantId)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  if (query.from) q = q.gte('data', query.from)
  if (query.to) q = q.lte('data', query.to)
  if (query.limit) q = q.limit(query.limit)

  const { data, error } = await q
  if (error) throw mapSupabaseError(error)
  return (data ?? []) as VeprimBatchRow[]
}

export async function findVeprimBatchById(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
): Promise<VeprimBatchRow | null> {
  const { data, error } = await supabase
    .from('veprim_batch')
    .select('*')
    .eq('pronari_id', tenantId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw mapSupabaseError(error)
  return data as VeprimBatchRow | null
}

export async function updateVeprimBatch(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<VeprimBatchRow> {
  const { data, error } = await supabase
    .from('veprim_batch')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('pronari_id', tenantId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw mapSupabaseError(error)
  return data as VeprimBatchRow
}

export async function deleteVeprimBatch(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('veprim_batch')
    .delete()
    .eq('pronari_id', tenantId)
    .eq('id', id)

  if (error) throw mapSupabaseError(error)
}

export async function listVeprimetByBatchId(
  supabase: SupabaseClient,
  tenantId: string,
  batchId: string,
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from('veprimi')
    .select('*')
    .eq('pronari_id', tenantId)
    .eq('batch_id', batchId)

  if (error) throw mapSupabaseError(error)
  return data ?? []
}
