import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ProductCreateSchema,
  ProductIdParamsSchema,
  ProductUpdateSchema,
} from '@inventari/shared'
import { mapSupabaseError } from '../errors.js'

const PRODUCT_SELECT =
  'id,kodi,emri,gjendje_kosove,gjendje_shqiperi,created_at,updated_at'

export async function listProducts(
  supabase: SupabaseClient,
  query: { search?: string },
) {
  let q = supabase.from('produkti').select(PRODUCT_SELECT).order('kodi', { ascending: true })

  if (query.search && query.search.trim()) {
    const s = query.search.trim()
    q = q.or(`kodi.ilike.%${s}%,emri.ilike.%${s}%`)
  }

  const { data, error } = await q
  if (error) throw mapSupabaseError(error)
  return data ?? []
}

export async function createProduct(supabase: SupabaseClient, body: unknown) {
  const parsed = ProductCreateSchema.parse(body)
  const { data, error } = await supabase
    .from('produkti')
    .insert({
      kodi: parsed.kodi,
      emri: parsed.emri,
      gjendje_kosove: parsed.gjendje_kosove ?? 0,
      gjendje_shqiperi: parsed.gjendje_shqiperi ?? 0,
    })
    .select(PRODUCT_SELECT)
    .single()

  if (error) throw mapSupabaseError(error)
  return data
}

export async function updateProduct(supabase: SupabaseClient, id: string, body: unknown) {
  ProductIdParamsSchema.parse({ id })
  const parsed = ProductUpdateSchema.parse(body)

  const { data, error } = await supabase
    .from('produkti')
    .update({
      kodi: parsed.kodi,
      emri: parsed.emri,
      gjendje_kosove: parsed.gjendje_kosove,
      gjendje_shqiperi: parsed.gjendje_shqiperi,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .single()

  if (error) throw mapSupabaseError(error)
  return data
}

export async function deleteProduct(supabase: SupabaseClient, id: string) {
  ProductIdParamsSchema.parse({ id })

  const { data: product, error: productReadError } = await supabase
    .from('produkti')
    .select('kodi')
    .eq('id', id)
    .single()

  if (productReadError) throw mapSupabaseError(productReadError)

  const { error: actionsDeleteError } = await supabase
    .from('veprimi')
    .delete()
    .eq('kodi_produktit', product.kodi)

  if (actionsDeleteError) throw mapSupabaseError(actionsDeleteError)

  const { error } = await supabase.from('produkti').delete().eq('id', id)
  if (error) throw mapSupabaseError(error)
  return { ok: true as const }
}
