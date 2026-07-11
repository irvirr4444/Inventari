import type { SupabaseClient } from '@supabase/supabase-js'
import type { LokacioniAkses } from '@inventari/shared'
import type { LocationAccessEntry } from '../domain/user.js'
import { mapSupabaseError } from '../errors.js'

export type LokacioniAccessRow = {
  id: string
  account_owner_id: string
  lokacioni_id: string
  perdorues_id: string
  akses: LokacioniAkses
  created_at: string
  updated_at: string
}

export async function listAccessForPerdorues(
  supabase: SupabaseClient,
  perdoruesId: string,
): Promise<LocationAccessEntry[]> {
  const { data, error } = await supabase
    .from('lokacioni_perdorues_access')
    .select('lokacioni_id,akses')
    .eq('perdorues_id', perdoruesId)

  if (error) throw mapSupabaseError(error)
  return (data ?? []) as LocationAccessEntry[]
}

export async function listAccessRowsForAccount(
  supabase: SupabaseClient,
  accountOwnerId: string,
  perdoruesId?: string,
): Promise<LokacioniAccessRow[]> {
  let q = supabase
    .from('lokacioni_perdorues_access')
    .select('*')
    .eq('account_owner_id', accountOwnerId)

  if (perdoruesId) q = q.eq('perdorues_id', perdoruesId)

  const { data, error } = await q
  if (error) throw mapSupabaseError(error)
  return (data ?? []) as LokacioniAccessRow[]
}

export async function replaceAccessForPerdorues(
  supabase: SupabaseClient,
  accountOwnerId: string,
  perdoruesId: string,
  entries: LocationAccessEntry[],
): Promise<LocationAccessEntry[]> {
  const { error: deleteError } = await supabase
    .from('lokacioni_perdorues_access')
    .delete()
    .eq('perdorues_id', perdoruesId)

  if (deleteError) throw mapSupabaseError(deleteError)

  if (entries.length === 0) return []

  const rows = entries.map((entry) => ({
    account_owner_id: accountOwnerId,
    lokacioni_id: entry.lokacioni_id,
    perdorues_id: perdoruesId,
    akses: entry.akses,
    updated_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('lokacioni_perdorues_access')
    .insert(rows)
    .select('lokacioni_id,akses')

  if (error) throw mapSupabaseError(error)
  return (data ?? []) as LocationAccessEntry[]
}

export async function deleteAccessForPerdorues(
  supabase: SupabaseClient,
  perdoruesId: string,
): Promise<void> {
  const { error } = await supabase
    .from('lokacioni_perdorues_access')
    .delete()
    .eq('perdorues_id', perdoruesId)

  if (error) throw mapSupabaseError(error)
}
