import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantConfigPatch } from '@inventari/shared'
import { mapSupabaseError } from '../errors.js'

const TENANT_CONFIG_SELECT =
  'id,pronari_id,track_price,onboarding_complete,tutorial_seen,created_at,updated_at'

export type TenantConfigRow = {
  id: string
  pronari_id: string
  track_price: boolean
  onboarding_complete: boolean
  tutorial_seen: boolean
  created_at: string
  updated_at: string
}

export async function getTenantConfigRow(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<TenantConfigRow | null> {
  const { data, error } = await supabase
    .from('tenant_config')
    .select(TENANT_CONFIG_SELECT)
    .eq('pronari_id', tenantId)
    .maybeSingle()

  if (error) throw mapSupabaseError(error)
  return data as TenantConfigRow | null
}

export async function upsertTenantConfigRow(
  supabase: SupabaseClient,
  tenantId: string,
  patch: TenantConfigPatch,
): Promise<TenantConfigRow> {
  const existing = await getTenantConfigRow(supabase, tenantId)

  if (existing) {
    const { data, error } = await supabase
      .from('tenant_config')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('pronari_id', tenantId)
      .select(TENANT_CONFIG_SELECT)
      .single()

    if (error) throw mapSupabaseError(error)
    return data as TenantConfigRow
  }

  const { data, error } = await supabase
    .from('tenant_config')
    .insert({
      pronari_id: tenantId,
      track_price: patch.track_price ?? true,
      onboarding_complete: false,
      tutorial_seen: false,
    })
    .select(TENANT_CONFIG_SELECT)
    .single()

  if (error) throw mapSupabaseError(error)
  return data as TenantConfigRow
}

export async function markOnboardingCompleteRow(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<TenantConfigRow> {
  const existing = await getTenantConfigRow(supabase, tenantId)

  if (existing) {
    const { data, error } = await supabase
      .from('tenant_config')
      .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
      .eq('pronari_id', tenantId)
      .select(TENANT_CONFIG_SELECT)
      .single()

    if (error) throw mapSupabaseError(error)
    return data as TenantConfigRow
  }

  const { data, error } = await supabase
    .from('tenant_config')
    .insert({
      pronari_id: tenantId,
      track_price: true,
      onboarding_complete: true,
      tutorial_seen: false,
    })
    .select(TENANT_CONFIG_SELECT)
    .single()

  if (error) throw mapSupabaseError(error)
  return data as TenantConfigRow
}

export async function markTutorialSeenRow(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<TenantConfigRow> {
  const existing = await getTenantConfigRow(supabase, tenantId)

  if (existing) {
    const { data, error } = await supabase
      .from('tenant_config')
      .update({ tutorial_seen: true, updated_at: new Date().toISOString() })
      .eq('pronari_id', tenantId)
      .select(TENANT_CONFIG_SELECT)
      .single()

    if (error) throw mapSupabaseError(error)
    return data as TenantConfigRow
  }

  const { data, error } = await supabase
    .from('tenant_config')
    .insert({
      pronari_id: tenantId,
      track_price: true,
      onboarding_complete: false,
      tutorial_seen: true,
    })
    .select(TENANT_CONFIG_SELECT)
    .single()

  if (error) throw mapSupabaseError(error)
  return data as TenantConfigRow
}
