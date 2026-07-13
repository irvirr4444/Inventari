import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreateManagedUserBody,
  LocationAccessEntry,
  ReplaceLocationAccessBody,
  UpdateManagedUserBody,
} from '@inventari/shared'
import {
  CreateManagedUserBodySchema,
  ReplaceLocationAccessBodySchema,
  UpdateManagedUserBodySchema,
} from '@inventari/shared'
import type { SessionUser } from '../../domain/user.js'
import { AppError } from '../../errors.js'
import { hashPassword } from '../../auth/password.js'
import { requireAdmin, tenantIdFor } from '../access/index.js'
import {
  deleteAccessForPerdorues,
  listAccessForPerdorues,
  replaceAccessForPerdorues,
} from '../../repositories/lokacioniAccessRepository.js'
import { findLokacioniById } from '../../repositories/lokacioniRepository.js'
import {
  createPerdorues,
  deletePerdorues,
  findPerdoruesByEmail,
  findPerdoruesByEmri,
  findPerdoruesById,
  listPerdoruesByAccount,
  normalizeEmri,
  updatePerdorues,
} from '../../repositories/perdoruesRepository.js'

function toManagedUser(row: {
  id: string
  email: string | null
  emri: string | null
  role: SessionUser['role']
  aktiv: boolean
  krijuar_at: string
}) {
  return {
    id: row.id,
    email: row.email,
    emri: row.emri,
    role: row.role,
    aktiv: row.aktiv,
    created_at: row.krijuar_at,
  }
}

async function assertAccountMember(
  supabase: SupabaseClient,
  accountOwnerId: string,
  userId: string,
) {
  const user = await findPerdoruesById(supabase, userId)
  if (!user || user.account_owner_id !== accountOwnerId) {
    throw new AppError(404, 'User not found')
  }
  return user
}

async function validateLocationAccessEntries(
  supabase: SupabaseClient,
  accountOwnerId: string,
  entries: LocationAccessEntry[],
): Promise<void> {
  for (const entry of entries) {
    const loc = await findLokacioniById(supabase, accountOwnerId, entry.lokacioni_id)
    if (!loc) {
      throw new AppError(400, `Invalid location: ${entry.lokacioni_id}`)
    }
  }
}

export async function listManagedUsers(
  supabase: SupabaseClient,
  actor: SessionUser,
  opts?: { search?: string },
) {
  requireAdmin(actor)
  const rows = await listPerdoruesByAccount(supabase, tenantIdFor(actor), opts)
  return rows.map(toManagedUser)
}

export async function createManagedUser(
  supabase: SupabaseClient,
  actor: SessionUser,
  body: unknown,
) {
  requireAdmin(actor)
  const input = CreateManagedUserBodySchema.parse(body)
  const accountOwnerId = tenantIdFor(actor)
  const emri = normalizeEmri(input.emri)
  if (!emri) throw new AppError(400, 'Name is required')

  const existingEmri = await findPerdoruesByEmri(supabase, emri)
  if (existingEmri) throw new AppError(409, 'Name already registered')

  if (input.email) {
    const existingEmail = await findPerdoruesByEmail(supabase, input.email)
    if (existingEmail) throw new AppError(409, 'Email already registered')
  }

  const passwordHash = await hashPassword(input.password)
  const created = await createPerdorues(supabase, {
    email: input.email ?? null,
    passwordHash,
    emri,
    uiLloji: 'dynamic',
    isLegacy: false,
    role: input.role,
    accountOwnerId,
  })

  if (input.role === 'perdorues' && input.location_access?.length) {
    await validateLocationAccessEntries(supabase, accountOwnerId, input.location_access)
    await replaceAccessForPerdorues(
      supabase,
      accountOwnerId,
      created.id,
      input.location_access,
    )
  }

  return toManagedUser(created)
}

export async function updateManagedUser(
  supabase: SupabaseClient,
  actor: SessionUser,
  userId: string,
  body: unknown,
) {
  requireAdmin(actor)
  const input = UpdateManagedUserBodySchema.parse(body)
  const accountOwnerId = tenantIdFor(actor)
  const existing = await assertAccountMember(supabase, accountOwnerId, userId)

  if (userId === actor.id && input.role && input.role !== 'admin') {
    throw new AppError(400, 'Cannot change your own role')
  }
  if (userId === actor.id && input.aktiv === false) {
    throw new AppError(400, 'Cannot deactivate yourself')
  }

  const patch: Parameters<typeof updatePerdorues>[2] = {}
  if (input.emri !== undefined) {
    const emri = normalizeEmri(input.emri)
    if (!emri) throw new AppError(400, 'Name is required')
    const duplicate = await findPerdoruesByEmri(supabase, emri)
    if (duplicate && duplicate.id !== userId) {
      throw new AppError(409, 'Name already registered')
    }
    patch.emri = emri
  }
  if (input.email !== undefined) {
    if (input.email) {
      const duplicate = await findPerdoruesByEmail(supabase, input.email)
      if (duplicate && duplicate.id !== userId) {
        throw new AppError(409, 'Email already registered')
      }
      patch.email = input.email.trim().toLowerCase()
    } else {
      patch.email = null
    }
  }
  if (input.password) {
    patch.password_hash = await hashPassword(input.password)
  }
  if (input.role !== undefined) patch.role = input.role
  if (input.aktiv !== undefined) patch.aktiv = input.aktiv

  const updated = await updatePerdorues(supabase, userId, patch)
  return toManagedUser(updated)
}

export async function deleteManagedUser(
  supabase: SupabaseClient,
  actor: SessionUser,
  userId: string,
) {
  requireAdmin(actor)
  if (userId === actor.id) {
    throw new AppError(400, 'Cannot delete yourself')
  }

  const accountOwnerId = tenantIdFor(actor)
  await assertAccountMember(supabase, accountOwnerId, userId)
  await deleteAccessForPerdorues(supabase, userId)

  await deletePerdorues(supabase, userId)
  return { ok: true as const, deleted: true as const }
}

export async function getManagedUserAccess(
  supabase: SupabaseClient,
  actor: SessionUser,
  userId: string,
) {
  requireAdmin(actor)
  const accountOwnerId = tenantIdFor(actor)
  const user = await assertAccountMember(supabase, accountOwnerId, userId)
  if (user.role === 'admin') {
    return { location_access: [] as LocationAccessEntry[] }
  }
  const location_access = await listAccessForPerdorues(supabase, userId)
  return { location_access }
}

export async function replaceManagedUserAccess(
  supabase: SupabaseClient,
  actor: SessionUser,
  userId: string,
  body: unknown,
) {
  requireAdmin(actor)
  const input = ReplaceLocationAccessBodySchema.parse(body) as ReplaceLocationAccessBody
  const accountOwnerId = tenantIdFor(actor)
  const user = await assertAccountMember(supabase, accountOwnerId, userId)
  if (user.role === 'admin') {
    throw new AppError(400, 'Admin users do not use location access')
  }

  await validateLocationAccessEntries(supabase, accountOwnerId, input.location_access)
  const location_access = await replaceAccessForPerdorues(
    supabase,
    accountOwnerId,
    userId,
    input.location_access,
  )
  return { location_access }
}
