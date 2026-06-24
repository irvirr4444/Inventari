import type { SupabaseClient } from '@supabase/supabase-js'
import type { Country } from '@inventari/shared'
import { mapSupabaseError } from '../errors.js'

export async function fetchVeprimBatchById(
  supabase: SupabaseClient,
  tenantId: string,
  batchId: string,
) {
  const { data, error } = await supabase
    .from('veprim_batch')
    .select('*')
    .eq('pronari_id', tenantId)
    .eq('id', batchId)
    .single()

  if (error) throw mapSupabaseError(error)
  return data
}

export async function fetchVeprimetByBatchId(
  supabase: SupabaseClient,
  tenantId: string,
  batchId: string,
) {
  const { data, error } = await supabase
    .from('veprimi')
    .select('*')
    .eq('pronari_id', tenantId)
    .eq('batch_id', batchId)
    .order('kodi_produktit', { ascending: true })

  if (error) throw mapSupabaseError(error)
  return data ?? []
}

export async function fetchVeprimBatchesFiltered(
  supabase: SupabaseClient,
  tenantId: string,
  query: {
    lloji?: string
    shteti?: Country
    dateFrom?: string
    dateTo?: string
  },
) {
  let q = supabase
    .from('veprim_batch')
    .select('*')
    .eq('pronari_id', tenantId)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  if (query.lloji) q = q.eq('lloji', query.lloji)
  if (query.shteti) q = q.eq('shteti', query.shteti)
  if (query.dateFrom) q = q.gte('data', query.dateFrom)
  if (query.dateTo) q = q.lte('data', query.dateTo)

  const { data, error } = await q
  if (error) throw mapSupabaseError(error)
  return data ?? []
}

export async function fetchVeprimetByBatchIds(
  supabase: SupabaseClient,
  tenantId: string,
  batchIds: string[],
) {
  if (batchIds.length === 0) return []
  const { data, error } = await supabase
    .from('veprimi')
    .select('*')
    .eq('pronari_id', tenantId)
    .in('batch_id', batchIds)

  if (error) throw mapSupabaseError(error)
  return data ?? []
}

export async function touchVeprimBatchUpdatedAt(
  supabase: SupabaseClient,
  tenantId: string,
  batchId: string,
) {
  const { error } = await supabase
    .from('veprim_batch')
    .update({ updated_at: new Date().toISOString() })
    .eq('pronari_id', tenantId)
    .eq('id', batchId)

  if (error) throw mapSupabaseError(error)
}

export async function patchVeprimBatch(
  supabase: SupabaseClient,
  tenantId: string,
  batchId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('veprim_batch')
    .update(patch)
    .eq('pronari_id', tenantId)
    .eq('id', batchId)

  if (error) throw mapSupabaseError(error)
}

export async function patchVeprimi(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  patch: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('veprimi')
    .update(patch)
    .eq('pronari_id', tenantId)
    .eq('id', id)

  if (error) throw mapSupabaseError(error)
}

export async function insertVeprimiRows(
  supabase: SupabaseClient,
  tenantId: string,
  rows: Record<string, unknown>[],
) {
  const insertRows = rows.map((row) => ({ ...row, pronari_id: tenantId }))
  const { data, error } = await supabase.from('veprimi').insert(insertRows).select('id, lloji, shteti')
  if (error) throw mapSupabaseError(error)
  return data ?? []
}

export async function deleteVeprimiByIds(
  supabase: SupabaseClient,
  tenantId: string,
  ids: string[],
) {
  const { error } = await supabase
    .from('veprimi')
    .delete()
    .eq('pronari_id', tenantId)
    .in('id', ids)

  if (error) throw mapSupabaseError(error)
}

export async function deleteVeprimBatchById(
  supabase: SupabaseClient,
  tenantId: string,
  batchId: string,
) {
  const { error } = await supabase
    .from('veprim_batch')
    .delete()
    .eq('pronari_id', tenantId)
    .eq('id', batchId)

  if (error) throw mapSupabaseError(error)
}

export async function fetchProduktiNamesByKodi(
  supabase: SupabaseClient,
  tenantId: string,
  codes: string[],
) {
  if (codes.length === 0) return []
  const { data, error } = await supabase
    .from('produkti')
    .select('kodi,emri')
    .eq('pronari_id', tenantId)
    .in('kodi', codes)

  if (error) throw mapSupabaseError(error)
  return data ?? []
}

export async function fetchLegacyVeprimet(
  supabase: SupabaseClient,
  tenantId: string,
  filters: {
    dateFrom?: string
    dateTo?: string
    shteti?: Country
    lloji?: string
  },
) {
  let q = supabase
    .from('veprimi')
    .select('*')
    .eq('pronari_id', tenantId)
    .is('batch_id', null)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.dateFrom) q = q.gte('data', filters.dateFrom)
  if (filters.dateTo) q = q.lte('data', filters.dateTo)
  if (filters.shteti) q = q.eq('shteti', filters.shteti)
  if (filters.lloji && filters.lloji !== 'Transfer') q = q.eq('lloji', filters.lloji)

  const { data, error } = await q
  if (error) {
    if (error.message.includes('batch_id') || error.code === '42703') return []
    throw mapSupabaseError(error)
  }
  return data ?? []
}

export async function fetchLegacyVeprimetByDate(
  supabase: SupabaseClient,
  tenantId: string,
  data: string,
) {
  const { data: rows, error } = await supabase
    .from('veprimi')
    .select('*')
    .eq('pronari_id', tenantId)
    .is('batch_id', null)
    .eq('data', data)

  if (error) throw mapSupabaseError(error)
  return rows ?? []
}

export async function insertLegacyVeprimBatch(
  supabase: SupabaseClient,
  tenantId: string,
  input: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from('veprim_batch')
    .insert({ ...input, pronari_id: tenantId })
    .select('id')
    .single()

  if (error) throw mapSupabaseError(error)
  return data.id as string
}

export async function linkVeprimetToBatch(
  supabase: SupabaseClient,
  tenantId: string,
  rowIds: string[],
  batchId: string,
) {
  const { error } = await supabase
    .from('veprimi')
    .update({ batch_id: batchId })
    .eq('pronari_id', tenantId)
    .in('id', rowIds)

  if (error) throw mapSupabaseError(error)
}

export async function fetchExportVeprimet(
  supabase: SupabaseClient,
  tenantId: string,
  query: {
    shteti?: Country
    from?: string
    to?: string
    lloji?: 'Hyrje' | 'Dalje'
  },
) {
  let q = supabase
    .from('veprimi')
    .select('*')
    .eq('pronari_id', tenantId)
    .order('data', { ascending: true })
    .order('created_at', { ascending: true })

  if (query.shteti) q = q.eq('shteti', query.shteti)
  if (query.lloji) q = q.eq('lloji', query.lloji)
  if (query.from) q = q.gte('data', query.from)
  if (query.to) q = q.lte('data', query.to)

  const { data, error } = await q
  if (error) throw mapSupabaseError(error)
  return data ?? []
}

export async function fetchExportLegacyProducts(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from('produkti')
    .select('kodi,emri,gjendje_kosove,gjendje_shqiperi')
    .eq('pronari_id', tenantId)
    .order('emri', { ascending: true })

  if (error) throw mapSupabaseError(error)
  return data ?? []
}

export async function fetchExportLegacyActions(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from('veprimi')
    .select(
      'id,lloji,data,shteti,kodi_produktit,cmimi_njesi,sasia,shenim,created_at,batch_id,veprim_batch(ora,pershkrimi,lloji,shteti,destination_shteti)',
    )
    .eq('pronari_id', tenantId)
    .order('data', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw mapSupabaseError(error)
  return data ?? []
}

export async function fetchExportDynamicActions(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from('veprimi')
    .select(
      'id,lloji,data,lokacioni_id,kodi_produktit,cmimi_njesi,sasia,shenim,created_at,batch_id,veprim_batch(ora,pershkrimi,lloji,lokacioni_id,destination_lokacioni_id)',
    )
    .eq('pronari_id', tenantId)
    .order('data', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw mapSupabaseError(error)
  return data ?? []
}
