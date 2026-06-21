import type { SupabaseClient } from '@supabase/supabase-js'
import { mapSupabaseError } from '../errors.js'

const PRODUCT_SELECT =
  'id,kodi,emri,gjendje_kosove,gjendje_shqiperi,njesi_matese,pronari_id,created_at,updated_at'

export type ProduktiRow = {
  id: string
  kodi: string
  emri: string
  gjendje_kosove: number
  gjendje_shqiperi: number
  njesi_matese: string | null
  pronari_id: string
  created_at?: string
  updated_at?: string
}

export async function listProduktet(
  supabase: SupabaseClient,
  tenantId: string,
  query: { search?: string },
): Promise<ProduktiRow[]> {
  let q = supabase
    .from('produkti')
    .select(PRODUCT_SELECT)
    .eq('pronari_id', tenantId)
    .order('kodi', { ascending: true })

  if (query.search?.trim()) {
    const s = query.search.trim()
    q = q.or(`kodi.ilike.%${s}%,emri.ilike.%${s}%`)
  }

  const { data, error } = await q
  if (error) throw mapSupabaseError(error)
  return (data ?? []) as ProduktiRow[]
}

export async function findProduktiById(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
): Promise<ProduktiRow | null> {
  const { data, error } = await supabase
    .from('produkti')
    .select(PRODUCT_SELECT)
    .eq('pronari_id', tenantId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw mapSupabaseError(error)
  return data as ProduktiRow | null
}

export async function findProduktetByKodi(
  supabase: SupabaseClient,
  tenantId: string,
  codes: string[],
): Promise<ProduktiRow[]> {
  const { data, error } = await supabase
    .from('produkti')
    .select(PRODUCT_SELECT)
    .eq('pronari_id', tenantId)
    .in('kodi', codes)

  if (error) throw mapSupabaseError(error)
  return (data ?? []) as ProduktiRow[]
}

export async function insertProdukti(
  supabase: SupabaseClient,
  tenantId: string,
  input: {
    kodi: string
    emri: string
    gjendje_kosove?: number
    gjendje_shqiperi?: number
    njesi_matese?: string | null
  },
): Promise<ProduktiRow> {
  const { data, error } = await supabase
    .from('produkti')
    .insert({
      pronari_id: tenantId,
      kodi: input.kodi,
      emri: input.emri,
      gjendje_kosove: input.gjendje_kosove ?? 0,
      gjendje_shqiperi: input.gjendje_shqiperi ?? 0,
      njesi_matese: input.njesi_matese ?? null,
    })
    .select(PRODUCT_SELECT)
    .single()

  if (error) throw mapSupabaseError(error)
  return data as ProduktiRow
}

export async function updateProdukti(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  patch: Partial<
    Pick<ProduktiRow, 'kodi' | 'emri' | 'gjendje_kosove' | 'gjendje_shqiperi' | 'njesi_matese'>
  >,
): Promise<ProduktiRow> {
  const { data, error } = await supabase
    .from('produkti')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('pronari_id', tenantId)
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .single()

  if (error) throw mapSupabaseError(error)
  return data as ProduktiRow
}

export async function deleteProdukti(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
): Promise<{ kodi: string }> {
  const product = await findProduktiById(supabase, tenantId, id)
  if (!product) throw mapSupabaseError({ message: 'Not found', code: 'PGRST116' } as never)

  const { error: actionsDeleteError } = await supabase
    .from('veprimi')
    .delete()
    .eq('pronari_id', tenantId)
    .eq('kodi_produktit', product.kodi)

  if (actionsDeleteError) throw mapSupabaseError(actionsDeleteError)

  const { error } = await supabase
    .from('produkti')
    .delete()
    .eq('pronari_id', tenantId)
    .eq('id', id)

  if (error) throw mapSupabaseError(error)
  return { kodi: product.kodi }
}

export async function listGjendjeForProducts(
  supabase: SupabaseClient,
  tenantId: string,
  productIds: string[],
): Promise<Array<{ produkti_id: string; lokacioni_id: string; sasia: number }>> {
  if (productIds.length === 0) return []

  const { data, error } = await supabase
    .from('gjendje')
    .select('produkti_id,lokacioni_id,sasia')
    .in('produkti_id', productIds)

  if (error) throw mapSupabaseError(error)

  const owned = new Set(productIds)
  return (data ?? []).filter((row) => owned.has(row.produkti_id)) as Array<{
    produkti_id: string
    lokacioni_id: string
    sasia: number
  }>
}

export async function upsertGjendjeRows(
  supabase: SupabaseClient,
  tenantId: string,
  rows: Array<{ produkti_id: string; lokacioni_id: string; sasia: number }>,
): Promise<void> {
  void tenantId
  if (rows.length === 0) return
  const { error } = await supabase.from('gjendje').upsert(rows, {
    onConflict: 'produkti_id,lokacioni_id',
  })
  if (error) throw mapSupabaseError(error)
}
