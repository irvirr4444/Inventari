import type { SupabaseClient } from '@supabase/supabase-js'
import type { SessionUser } from '../domain/user.js'
import { AppError } from '../errors.js'
import { pickAvailableKodi } from '../domain/lokacioniKodi.js'
import {
  createLokacioni,
  findLokacioniById,
  getGjendjeForLokacioni,
  listLokacionetByOwner,
  updateLokacioni,
} from '../repositories/lokacioniRepository.js'
import type { LokacioniRow } from '../domain/lokacioni.js'
import {
  isAdmin,
  listAllowedLocationIds,
  requireAdmin,
  tenantIdFor,
} from './accessControlService.js'

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
  const tenantId = tenantIdFor(user)
  const rows = await listLokacionetByOwner(supabase, tenantId, opts)
  if (isAdmin(user)) return rows

  const allowed = new Set(listAllowedLocationIds(user, 'view'))
  return rows.filter((row) => allowed.has(row.id))
}

export async function createUserLokacioni(
  supabase: SupabaseClient,
  user: SessionUser,
  input: { emri: string; kodi?: string; flag_emoji?: string | null; rradhitja?: number },
): Promise<LokacioniRow> {
  requireAdmin(user)
  if (user.isLegacy) {
    throw new AppError(403, 'Legacy accounts cannot modify locations')
  }

  const tenantId = tenantIdFor(user)
  const emri = input.emri.trim()
  const kodi = input.kodi?.trim() || (await allocateKodi(supabase, tenantId, emri))
  const flag_emoji = input.flag_emoji ?? DEFAULT_LOCATION_EMOJI

  return createLokacioni(supabase, tenantId, {
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
  requireAdmin(user)
  if (user.isLegacy) {
    throw new AppError(403, 'Legacy accounts cannot modify locations')
  }

  const tenantId = tenantIdFor(user)
  const existing = await findLokacioniById(supabase, tenantId, id)
  if (!existing) throw new AppError(404, 'Vendndodhja nuk u gjet')

  let stock_warning: string | undefined
  if (patch.aktiv === false && existing.aktiv) {
    const stock = await getGjendjeForLokacioni(supabase, tenantId, id)
    if (stock > 0) {
      stock_warning =
        'Kjo vendndodhje ende ka gjendje — çaktivizimi nuk e fshin historinë, por nuk do të mund të regjistroni veprime të reja.'
    }
  }

  const updatePatch: Partial<
    Pick<LokacioniRow, 'emri' | 'kodi' | 'flag_emoji' | 'rradhitja' | 'show_in_summary' | 'aktiv'>
  > = { ...patch }

  if (patch.emri !== undefined && patch.emri.trim() !== existing.emri) {
    updatePatch.emri = patch.emri.trim()
    updatePatch.kodi = await allocateKodi(supabase, tenantId, updatePatch.emri, id)
  }

  const lokacioni = await updateLokacioni(supabase, tenantId, id, updatePatch)
  return { lokacioni, stock_warning }
}

export async function deleteUserLokacioni(
  supabase: SupabaseClient,
  user: SessionUser,
  id: string,
): Promise<{ ok: true }> {
  requireAdmin(user)
  if (user.isLegacy) {
    throw new AppError(403, 'Legacy accounts cannot modify locations')
  }

  const tenantId = tenantIdFor(user)
  const existing = await findLokacioniById(supabase, tenantId, id)
  if (!existing) return { ok: true }

  await updateLokacioni(supabase, tenantId, id, {
    aktiv: false,
    show_in_summary: false,
  })
  return { ok: true }
}
