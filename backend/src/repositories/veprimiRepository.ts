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
