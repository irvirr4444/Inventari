import type { SupabaseClient } from '@supabase/supabase-js'
import type { SessionUser } from '../domain/user.js'
import { pickAvailableKodi } from '../domain/lokacioniKodi.js'
import { AppError } from '../errors.js'
import {
  createLokacioni,
  findLokacioniById,
  getGjendjeForLokacioni,
  listLokacionetByOwner,
  updateLokacioni,
} from '../repositories/lokacioniRepository.js'
import type { LokacioniRow } from '../domain/lokacioni.js'

const DEFAULT_LOCATION_EMOJI = '📍'

async function allocateKodi(
  supabase: SupabaseClient,
  tenantId: string,
  emri: string,
  excludeId?: string,
): Promise<string> {
  const rows = await listLokacionetByOwner(supabase, tenantId, { includeInactive: true })
  const excludeRow = excludeId ? rows.find((r) => r.id === excludeId) : undefined
  const taken = new Set(rows.map((r) => r.kodi).filter((k) => k !== excludeRow?.kodi))
  return pickAvailableKodi(emri, taken, excludeRow?.kodi)
}

export async function listUserLokacionet(
  supabase: SupabaseClient,
  user: SessionUser,
  opts?: { includeInactive?: boolean },
): Promise<LokacioniRow[]> {
  return listLokacionetByOwner(supabase, user.id, opts)
}

export async function createUserLokacioni(
  supabase: SupabaseClient,
  user: SessionUser,
  input: { emri: string; kodi?: string; flag_emoji?: string | null; rradhitja?: number },
): Promise<LokacioniRow> {
  if (user.isLegacy) {
    throw new AppError(403, 'Legacy accounts cannot modify locations')
  }

  const emri = input.emri.trim()
  const kodi = input.kodi?.trim() || (await allocateKodi(supabase, user.id, emri))
  const flag_emoji = input.flag_emoji ?? DEFAULT_LOCATION_EMOJI

  return createLokacioni(supabase, user.id, {
    emri,
    kodi,
    flag_emoji,
    rradhitja: input.rradhitja,
  })
}

export async function patchUserLokacioni(
  supabase: SupabaseClient,
  user: SessionUser,
  id: string,
  patch: Partial<
    Pick<LokacioniRow, 'emri' | 'flag_emoji' | 'rradhitja' | 'show_in_summary' | 'aktiv'>
  >,
): Promise<{ lokacioni: LokacioniRow; stock_warning?: string }> {
  if (user.isLegacy) {
    throw new AppError(403, 'Legacy accounts cannot modify locations')
  }

  const existing = await findLokacioniById(supabase, user.id, id)
  if (!existing) throw new AppError(404, 'Lokacioni not found')

  let stock_warning: string | undefined
  if (patch.aktiv === false && existing.aktiv) {
    const stock = await getGjendjeForLokacioni(supabase, user.id, id)
    if (stock > 0) {
      stock_warning =
        'Ky lokacion ende ka gjendje — çaktivizimi nuk e fshin historinë, por nuk do të mund të regjistroni veprime të reja.'
    }
  }

  const updatePatch: Partial<
    Pick<LokacioniRow, 'emri' | 'kodi' | 'flag_emoji' | 'rradhitja' | 'show_in_summary' | 'aktiv'>
  > = { ...patch }

  if (patch.emri !== undefined && patch.emri.trim() !== existing.emri) {
    updatePatch.emri = patch.emri.trim()
    updatePatch.kodi = await allocateKodi(supabase, user.id, updatePatch.emri, id)
  }

  const lokacioni = await updateLokacioni(supabase, user.id, id, updatePatch)
  return { lokacioni, stock_warning }
}
