import type { SupabaseClient } from '@supabase/supabase-js'
import { OAuth2Client } from 'google-auth-library'
import { AppError } from '../errors.js'
import { hashPassword, verifyPassword } from '../auth/password.js'
import {
  createPerdorues,
  findPerdoruesByEmail,
  findPerdoruesByGoogleSub,
  findPerdoruesById,
  toSessionUser,
  updateLegacyUserCredentials,
  updatePerdorues,
} from '../repositories/perdoruesRepository.js'
import { countActiveLokacionet } from '../repositories/lokacioniRepository.js'
import type { SessionUser } from '../domain/user.js'
import { LEGACY_USER_ID } from '../domain/user.js'

export async function ensureLegacyUserSeeded(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<void> {
  const existing = await findPerdoruesById(supabase, LEGACY_USER_ID)
  if (!existing) return

  if (existing.email === 'legacy@pending.migration' || !existing.password_hash) {
    const passwordHash = await hashPassword(password)
    await updateLegacyUserCredentials(supabase, LEGACY_USER_ID, email, passwordHash)
  }
}

export async function loginWithPassword(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<SessionUser> {
  await ensureLegacyUserSeeded(supabase, email, password)

  const user = await findPerdoruesByEmail(supabase, email)
  if (!user || !user.aktiv) {
    throw new AppError(401, 'Invalid credentials')
  }
  if (!user.password_hash && user.google_sub) {
    throw new AppError(401, 'Account created with Google')
  }
  if (!user.password_hash) {
    throw new AppError(401, 'Invalid credentials')
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) throw new AppError(401, 'Invalid credentials')

  return toSessionUser(user)
}

export async function signupWithPassword(
  supabase: SupabaseClient,
  input: { email: string; password: string; emri?: string },
): Promise<SessionUser> {
  const existing = await findPerdoruesByEmail(supabase, input.email)
  if (existing) throw new AppError(409, 'Email already registered')

  const passwordHash = await hashPassword(input.password)
  const user = await createPerdorues(supabase, {
    email: input.email,
    passwordHash,
    emri: input.emri ?? null,
    uiLloji: 'dynamic',
    isLegacy: false,
  })

  return toSessionUser(user)
}

export async function resolveSessionUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SessionUser | null> {
  const user = await findPerdoruesById(supabase, userId)
  if (!user || !user.aktiv) return null
  return toSessionUser(user)
}

export async function getSessionPayload(
  supabase: SupabaseClient,
  user: SessionUser,
): Promise<{
  ok: true
  user: SessionUser & { has_locations: boolean }
}> {
  const locationCount = await countActiveLokacionet(supabase, user.id)
  return {
    ok: true,
    user: {
      ...user,
      has_locations: locationCount > 0,
    },
  }
}

export async function loginWithGoogle(
  supabase: SupabaseClient,
  idToken: string,
  clientId: string,
): Promise<SessionUser> {
  const client = new OAuth2Client(clientId)
  let payload: { sub?: string; email?: string; name?: string } | undefined
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId })
    payload = ticket.getPayload()
  } catch {
    throw new AppError(401, 'Invalid Google token')
  }

  if (!payload?.sub || !payload.email) {
    throw new AppError(401, 'Invalid Google token')
  }

  const googleSub = payload.sub
  const email = payload.email.toLowerCase()

  let user = await findPerdoruesByGoogleSub(supabase, googleSub)
  if (user) {
    if (!user.aktiv) throw new AppError(403, 'Account disabled')
    return toSessionUser(user)
  }

  user = await findPerdoruesByEmail(supabase, email)
  if (user) {
    if (!user.aktiv) throw new AppError(403, 'Account disabled')
    const updated = await updatePerdorues(supabase, user.id, {
      google_sub: googleSub,
      emri: user.emri ?? payload.name ?? null,
    })
    return toSessionUser(updated)
  }

  const created = await createPerdorues(supabase, {
    email,
    emri: payload.name ?? null,
    googleSub,
    uiLloji: 'dynamic',
    isLegacy: false,
  })

  return toSessionUser(created)
}
