import type { SupabaseClient } from '@supabase/supabase-js'
import type { Country } from '@inventari/shared'
import { mapSupabaseError } from '../errors.js'

export type VeprimiRow = {
  id: string
  lloji: 'Hyrje' | 'Dalje'
  data: string
  shteti: Country
  lokacioni_id: string | null
  kodi_produktit: string
  cmimi_njesi: number
  sasia: number
  totali?: number
  batch_id: string | null
  pronari_id: string
  shenim?: string | null
  created_at?: string
}

export async function insertVeprimet(
  supabase: SupabaseClient,
  tenantId: string,
  rows: Array<{
    lloji: 'Hyrje' | 'Dalje'
    data?: string
    shteti: Country
    lokacioni_id?: string | null
    kodi_produktit: string
    cmimi_njesi: number
    sasia: number
    batch_id: string | null
    shenim?: string | null
  }>,
): Promise<VeprimiRow[]> {
  const insertRows = rows.map((row) => ({
    ...row,
    pronari_id: tenantId,
  }))

  const { data, error } = await supabase.from('veprimi').insert(insertRows).select('*')
  if (error) throw mapSupabaseError(error)
  return (data ?? []) as VeprimiRow[]
}

export async function listVeprimet(
  supabase: SupabaseClient,
  tenantId: string,
  query: {
    shteti?: Country
    from?: string
    to?: string
    lloji?: 'Hyrje' | 'Dalje'
    kodi?: string
    limit?: number
  },
): Promise<VeprimiRow[]> {
  let q = supabase
    .from('veprimi')
    .select('*')
    .eq('pronari_id', tenantId)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  if (query.shteti) q = q.eq('shteti', query.shteti)
  if (query.lloji) q = q.eq('lloji', query.lloji)
  if (query.kodi) q = q.eq('kodi_produktit', query.kodi)
  if (query.from) q = q.gte('data', query.from)
  if (query.to) q = q.lte('data', query.to)
  if (query.limit) q = q.limit(query.limit)

  const { data, error } = await q
  if (error) throw mapSupabaseError(error)
  return (data ?? []) as VeprimiRow[]
}

export async function listVeprimetForAnalytics(
  supabase: SupabaseClient,
  tenantId: string,
  query: { from?: string; to?: string },
): Promise<Array<{ lloji: string; shteti: Country; lokacioni_id: string | null; sasia: number; totali: number }>> {
  let q = supabase
    .from('veprimi')
    .select('lloji,shteti,lokacioni_id,sasia,totali')
    .eq('pronari_id', tenantId)

  if (query.from) q = q.gte('data', query.from)
  if (query.to) q = q.lte('data', query.to)

  const { data, error } = await q
  if (error) throw mapSupabaseError(error)
  return (data ?? []) as Array<{
    lloji: string
    shteti: Country
    lokacioni_id: string | null
    sasia: number
    totali: number
  }>
}

export type GroupedSummaryVeprimRow = {
  lloji: 'Hyrje' | 'Dalje'
  lokacioni_id: string | null
  kodi_produktit: string
  sasia: number
  totali: number
  batch_id: string | null
  veprim_batch: { created_by_user_id: string | null } | { created_by_user_id: string | null }[] | null
}

export async function listVeprimetForGroupedSummary(
  supabase: SupabaseClient,
  tenantId: string,
  query: { from?: string; to?: string },
): Promise<GroupedSummaryVeprimRow[]> {
  let q = supabase
    .from('veprimi')
    .select(
      'lloji,lokacioni_id,kodi_produktit,sasia,totali,batch_id,veprim_batch(created_by_user_id)',
    )
    .eq('pronari_id', tenantId)

  if (query.from) q = q.gte('data', query.from)
  if (query.to) q = q.lte('data', query.to)

  const { data, error } = await q
  if (error) throw mapSupabaseError(error)
  return (data ?? []) as GroupedSummaryVeprimRow[]
}

export type SummaryAggregateRow = {
  group_id: string
  in_qty: number
  in_value: number
  out_qty: number
  out_value: number
}

/** DB-side grouped aggregates. Returns null when the RPC is not installed yet. */
export async function fetchSummaryAggregates(
  supabase: SupabaseClient,
  tenantId: string,
  query: { from?: string; to?: string; groupBy: 'location' | 'product' | 'user' },
): Promise<SummaryAggregateRow[] | null> {
  const { data, error } = await supabase.rpc('inventari_summary_agg', {
    p_tenant_id: tenantId,
    p_from: query.from ?? null,
    p_to: query.to ?? null,
    p_group_by: query.groupBy,
  })

  if (error) {
    const message = error.message ?? ''
    const code = (error as { code?: string }).code
    // Function missing / schema cache — fall back to row fetch path.
    if (
      code === 'PGRST202' ||
      code === '42883' ||
      message.includes('inventari_summary_agg') ||
      message.toLowerCase().includes('could not find the function')
    ) {
      return null
    }
    throw mapSupabaseError(error)
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      group_id: String(row.group_id ?? ''),
      in_qty: Number(row.in_qty ?? 0),
      in_value: Number(row.in_value ?? 0),
      out_qty: Number(row.out_qty ?? 0),
      out_value: Number(row.out_value ?? 0),
    }))
    .filter((row) => row.group_id.length > 0)
}
