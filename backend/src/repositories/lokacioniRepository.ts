import type { SupabaseClient } from '@supabase/supabase-js'
import type { LokacioniRow } from '../domain/lokacioni.js'
import { mapSupabaseError } from '../errors.js'

const LOKACIONI_SELECT =
  'id,pronari_id,emri,kodi,flag_emoji,rradhitja,show_in_summary,aktiv'

export async function listLokacionetByOwner(
  supabase: SupabaseClient,
  tenantId: string,
  opts?: { includeInactive?: boolean },
): Promise<LokacioniRow[]> {
  let q = supabase
    .from('lokacioni')
    .select(LOKACIONI_SELECT)
    .eq('pronari_id', tenantId)
    .order('rradhitja', { ascending: true })

  if (!opts?.includeInactive) {
    q = q.eq('aktiv', true)
  }

  const { data, error } = await q
  if (error) throw mapSupabaseError(error)
  return (data ?? []) as LokacioniRow[]
}

/** Active + inactive locations for resolving names on historical batches. */
export async function lokacionetByIdForHistory(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<Map<string, LokacioniRow>> {
  const rows = await listLokacionetByOwner(supabase, tenantId, { includeInactive: true })
  return new Map(rows.map((row) => [row.id, row]))
}

export async function countActiveLokacionet(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('lokacioni')
    .select('id', { count: 'exact', head: true })
    .eq('pronari_id', tenantId)
    .eq('aktiv', true)

  if (error) throw mapSupabaseError(error)
  return count ?? 0
}

export async function findLokacioniById(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
): Promise<LokacioniRow | null> {
  const { data, error } = await supabase
    .from('lokacioni')
    .select(LOKACIONI_SELECT)
    .eq('pronari_id', tenantId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw mapSupabaseError(error)
  return data as LokacioniRow | null
}

export async function findLokacioniByKodi(
  supabase: SupabaseClient,
  tenantId: string,
  kodi: string,
): Promise<LokacioniRow | null> {
  const { data, error } = await supabase
    .from('lokacioni')
    .select(LOKACIONI_SELECT)
    .eq('pronari_id', tenantId)
    .eq('kodi', kodi)
    .maybeSingle()

  if (error) throw mapSupabaseError(error)
  return data as LokacioniRow | null
}

export async function createLokacioni(
  supabase: SupabaseClient,
  tenantId: string,
  input: {
    emri: string
    kodi: string
    flag_emoji?: string | null
    rradhitja?: number
    show_in_summary?: boolean
  },
): Promise<LokacioniRow> {
  const { data, error } = await supabase
    .from('lokacioni')
    .insert({
      pronari_id: tenantId,
      emri: input.emri,
      kodi: input.kodi,
      flag_emoji: input.flag_emoji ?? null,
      rradhitja: input.rradhitja ?? 0,
      show_in_summary: input.show_in_summary ?? true,
      aktiv: true,
    })
    .select(LOKACIONI_SELECT)
    .single()

  if (error) throw mapSupabaseError(error)
  return data as LokacioniRow
}

export async function updateLokacioni(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  patch: Partial<
    Pick<LokacioniRow, 'emri' | 'kodi' | 'flag_emoji' | 'rradhitja' | 'show_in_summary' | 'aktiv'>
  >,
): Promise<LokacioniRow> {
  const { data, error } = await supabase
    .from('lokacioni')
    .update(patch)
    .eq('pronari_id', tenantId)
    .eq('id', id)
    .select(LOKACIONI_SELECT)
    .single()

  if (error) throw mapSupabaseError(error)
  return data as LokacioniRow
}

export async function getGjendjeForLokacioni(
  supabase: SupabaseClient,
  tenantId: string,
  lokacioniId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('gjendje')
    .select('sasia, produkti:produkti_id!inner(pronari_id)')
    .eq('lokacioni_id', lokacioniId)

  if (error) throw mapSupabaseError(error)

  let total = 0
  for (const row of data ?? []) {
    const produkti = row.produkti as { pronari_id: string } | { pronari_id: string }[] | null
    const ownerId = Array.isArray(produkti) ? produkti[0]?.pronari_id : produkti?.pronari_id
    if (ownerId === tenantId) {
      total += Number(row.sasia ?? 0)
    }
  }
  return total
}
