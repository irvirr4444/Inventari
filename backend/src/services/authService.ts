import type { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { AppError } from '../errors.js'
import { hashPassword, verifyPassword } from '../auth/password.js'
import {
  createPerdorues,
  findPerdoruesByEmail,
  findPerdoruesByEmri,
  findPerdoruesByGoogleSub,
  findPerdoruesById,
  normalizeEmri,
  buildSessionUser,
  updateLegacyUserCredentials,
  updatePerdorues,
} from '../repositories/perdoruesRepository.js'
import { countActiveLokacionet } from '../repositories/lokacioniRepository.js'
import { getTenantConfigForSession } from '../services/tenantConfigService.js'
import { tenantIdFor } from '../services/accessControlService.js'
import type { TenantConfig } from '@inventari/shared'
import type { SessionUser } from '../domain/user.js'
import { LEGACY_USER_ID } from '../domain/user.js'

function looksLikeEmail(value: string): boolean {
  return value.includes('@')
}

async function resolveUniqueGoogleEmri(
  supabase: SupabaseClient,
  baseName: string | undefined,
  email: string,
): Promise<string> {
  const localPart = email.split('@')[0] ?? 'user'
  const candidates = [
    baseName ? normalizeEmri(baseName) : '',
    `${baseName ? normalizeEmri(baseName) : localPart} (${localPart})`,
    `${localPart} (${localPart})`,
  ].filter((value) => value.length > 0)

  for (const candidate of candidates) {
    const existing = await findPerdoruesByEmri(supabase, candidate)
    if (!existing) return candidate
  }

  let suffix = 2
  const root = normalizeEmri(baseName || localPart)
  while (suffix < 100) {
    const candidate = `${root} (${localPart}${suffix})`
    const existing = await findPerdoruesByEmri(supabase, candidate)
    if (!existing) return candidate
    suffix += 1
  }

  return `${root} (${crypto.randomUUID().slice(0, 8)})`
}

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

async function findPerdoruesForLogin(
  supabase: SupabaseClient,
  identifier: string,
) {
  const trimmed = identifier.trim()
  if (looksLikeEmail(trimmed)) {
    const byEmail = await findPerdoruesByEmail(supabase, trimmed)
    if (byEmail) return byEmail
  }
  return findPerdoruesByEmri(supabase, trimmed)
}

export async function loginWithPassword(
  supabase: SupabaseClient,
  emri: string,
  password: string,
): Promise<SessionUser> {
  if (looksLikeEmail(emri.trim())) {
    await ensureLegacyUserSeeded(supabase, emri.trim(), password)
  }

  const user = await findPerdoruesForLogin(supabase, emri)
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

  return buildSessionUser(supabase, user)
}

export async function signupWithPassword(
  supabase: SupabaseClient,
  input: { emri: string; password: string },
): Promise<SessionUser> {
  const emri = normalizeEmri(input.emri)
  if (!emri) throw new AppError(400, 'Name is required')
  if (looksLikeEmail(emri)) {
    throw new AppError(400, 'Use sign in for email accounts')
  }

  const existing = await findPerdoruesByEmri(supabase, emri)
  if (existing) throw new AppError(409, 'Name already registered')

  const passwordHash = await hashPassword(input.password)
  const user = await createPerdorues(supabase, {
    email: null,
    passwordHash,
    emri,
    uiLloji: 'dynamic',
    isLegacy: false,
    role: 'admin',
  })

  return buildSessionUser(supabase, user)
}

export async function resolveSessionUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SessionUser | null> {
  const user = await findPerdoruesById(supabase, userId)
  if (!user || !user.aktiv) return null
  return buildSessionUser(supabase, user)
}

export async function getSessionPayload(
  supabase: SupabaseClient,
  user: SessionUser,
): Promise<{
  ok: true
  user: SessionUser & {
    has_locations: boolean
    tenantConfig: TenantConfig | null
  }
}> {
  const locationCount = await countActiveLokacionet(supabase, tenantIdFor(user))
  const tenantConfig = await getTenantConfigForSession(supabase, user)
  return {
    ok: true,
    user: {
      ...user,
      has_locations: locationCount > 0,
      tenantConfig,
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
    return buildSessionUser(supabase, user)
  }

  user = await findPerdoruesByEmail(supabase, email)
  if (user) {
    if (!user.aktiv) throw new AppError(403, 'Account disabled')
    const updated = await updatePerdorues(supabase, user.id, {
      google_sub: googleSub,
      emri: user.emri ?? payload.name ?? null,
    })
    return buildSessionUser(supabase, updated)
  }

  const emri = await resolveUniqueGoogleEmri(supabase, payload.name, email)
  const created = await createPerdorues(supabase, {
    email,
    emri,
    googleSub,
    uiLloji: 'dynamic',
    isLegacy: false,
    role: 'admin',
  })

  return buildSessionUser(supabase, created)
}
