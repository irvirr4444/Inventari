import type { SupabaseClient } from '@supabase/supabase-js'
import type { PerdoruesRow, SessionUser } from '../domain/user.js'
import { mapSupabaseError } from '../errors.js'

export function normalizeEmri(emri: string): string {
  return emri.trim()
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

function toSessionUser(row: PerdoruesRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    emri: row.emri,
    uiLloji: row.ui_lloji,
    isLegacy: row.is_legacy,
  }
}

export async function findPerdoruesByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<PerdoruesRow | null> {
  const { data, error } = await supabase
    .from('perdorues')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (error) throw mapSupabaseError(error)
  return data as PerdoruesRow | null
}

export async function findPerdoruesByEmri(
  supabase: SupabaseClient,
  emri: string,
): Promise<PerdoruesRow | null> {
  const normalized = normalizeEmri(emri)
  if (!normalized) return null

  const { data, error } = await supabase
    .from('perdorues')
    .select('*')
    .ilike('emri', escapeIlikePattern(normalized))
    .maybeSingle()

  if (error) throw mapSupabaseError(error)
  return data as PerdoruesRow | null
}

export async function findPerdoruesById(
  supabase: SupabaseClient,
  id: string,
): Promise<PerdoruesRow | null> {
  const { data, error } = await supabase.from('perdorues').select('*').eq('id', id).maybeSingle()

  if (error) throw mapSupabaseError(error)
  return data as PerdoruesRow | null
}

export async function findPerdoruesByGoogleSub(
  supabase: SupabaseClient,
  googleSub: string,
): Promise<PerdoruesRow | null> {
  const { data, error } = await supabase
    .from('perdorues')
    .select('*')
    .eq('google_sub', googleSub)
    .maybeSingle()

  if (error) throw mapSupabaseError(error)
  return data as PerdoruesRow | null
}

export async function createPerdorues(
  supabase: SupabaseClient,
  input: {
    email?: string | null
    passwordHash?: string | null
    emri?: string | null
    googleSub?: string | null
    uiLloji?: 'legacy_fixed' | 'dynamic'
    isLegacy?: boolean
  },
): Promise<PerdoruesRow> {
  const { data, error } = await supabase
    .from('perdorues')
    .insert({
      email: input.email ? input.email.trim().toLowerCase() : null,
      password_hash: input.passwordHash ?? null,
      emri: input.emri ? normalizeEmri(input.emri) : null,
      google_sub: input.googleSub ?? null,
      ui_lloji: input.uiLloji ?? 'dynamic',
      is_legacy: input.isLegacy ?? false,
    })
    .select('*')
    .single()

  if (error) throw mapSupabaseError(error)
  return data as PerdoruesRow
}

export async function updatePerdorues(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<PerdoruesRow, 'email' | 'password_hash' | 'emri' | 'google_sub'>>,
): Promise<PerdoruesRow> {
  const { data, error } = await supabase
    .from('perdorues')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw mapSupabaseError(error)
  return data as PerdoruesRow
}

export async function updateLegacyUserCredentials(
  supabase: SupabaseClient,
  legacyUserId: string,
  email: string,
  passwordHash: string,
): Promise<void> {
  const { error } = await supabase
    .from('perdorues')
    .update({
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
    })
    .eq('id', legacyUserId)

  if (error) throw mapSupabaseError(error)
}

export { toSessionUser }
