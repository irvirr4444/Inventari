import type { TenantConfig } from '@inventari/shared'

export type UiLloji = 'legacy_fixed' | 'dynamic'

export type SessionUser = {
  id: string
  email: string | null
  emri: string | null
  uiLloji: UiLloji
  isLegacy: boolean
  has_locations: boolean
  tenantConfig: TenantConfig | null
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  track_price: true,
  onboarding_complete: false,
  tutorial_seen: false,
}
