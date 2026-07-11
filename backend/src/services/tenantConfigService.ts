import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantConfig, TenantConfigPatch } from '@inventari/shared'
import { TenantConfigPatchSchema, TenantConfigPostSchema } from '@inventari/shared'
import type { SessionUser } from '../domain/user.js'
import { AppError } from '../errors.js'
import { countActiveLokacionet } from '../repositories/lokacioniRepository.js'
import {
  getTenantConfigRow,
  markOnboardingCompleteRow,
  markTutorialSeenRow,
  upsertTenantConfigRow,
} from '../repositories/tenantConfigRepository.js'
import { requireAdmin, tenantIdFor } from './accessControlService.js'

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  track_price: true,
  onboarding_complete: false,
  tutorial_seen: false,
}

function toTenantConfigDto(row: {
  track_price: boolean
  onboarding_complete: boolean
  tutorial_seen: boolean
}): TenantConfig {
  return {
    track_price: row.track_price,
    onboarding_complete: row.onboarding_complete,
    tutorial_seen: row.tutorial_seen,
  }
}

function assertDynamicUser(user: SessionUser): void {
  if (user.isLegacy) {
    throw new AppError(403, 'Tenant config is not available for legacy users')
  }
}

export async function getTenantConfigForUser(
  supabase: SupabaseClient,
  user: SessionUser,
): Promise<{ config: TenantConfig; has_tenant_config: boolean }> {
  if (user.isLegacy) {
    return {
      config: { ...DEFAULT_TENANT_CONFIG, onboarding_complete: true, tutorial_seen: true },
      has_tenant_config: false,
    }
  }

  const row = await getTenantConfigRow(supabase, tenantIdFor(user))
  if (!row) {
    return { config: DEFAULT_TENANT_CONFIG, has_tenant_config: false }
  }

  return {
    config: toTenantConfigDto(row),
    has_tenant_config: true,
  }
}

export async function postTenantConfigForUser(
  supabase: SupabaseClient,
  user: SessionUser,
  body: unknown,
): Promise<TenantConfig> {
  assertDynamicUser(user)
  requireAdmin(user)
  const input = TenantConfigPostSchema.parse(body)
  const row = await upsertTenantConfigRow(supabase, tenantIdFor(user), { track_price: input.track_price })
  return toTenantConfigDto(row)
}

export async function patchTenantConfigForUser(
  supabase: SupabaseClient,
  user: SessionUser,
  body: unknown,
): Promise<TenantConfig> {
  assertDynamicUser(user)
  requireAdmin(user)
  const patch = TenantConfigPatchSchema.parse(body)
  const row = await upsertTenantConfigRow(supabase, tenantIdFor(user), patch)
  return toTenantConfigDto(row)
}

export async function completeOnboardingForUser(
  supabase: SupabaseClient,
  user: SessionUser,
): Promise<TenantConfig> {
  assertDynamicUser(user)
  requireAdmin(user)

  const locationCount = await countActiveLokacionet(supabase, tenantIdFor(user))
  if (locationCount < 1) {
    throw new AppError(400, 'At least one active location is required')
  }

  const row = await markOnboardingCompleteRow(supabase, tenantIdFor(user))
  return toTenantConfigDto(row)
}

export async function markTutorialSeenForUser(
  supabase: SupabaseClient,
  user: SessionUser,
): Promise<TenantConfig> {
  assertDynamicUser(user)
  const row = await markTutorialSeenRow(supabase, tenantIdFor(user))
  return toTenantConfigDto(row)
}

export async function getTenantConfigForSession(
  supabase: SupabaseClient,
  user: SessionUser,
): Promise<TenantConfig | null> {
  if (user.isLegacy) return null

  const row = await getTenantConfigRow(supabase, tenantIdFor(user))
  if (!row) {
    return DEFAULT_TENANT_CONFIG
  }

  return toTenantConfigDto(row)
}

export async function getTrackPriceForTenant(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<boolean> {
  const row = await getTenantConfigRow(supabase, tenantId)
  return row?.track_price ?? true
}
