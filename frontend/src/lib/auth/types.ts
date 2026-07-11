import type { LokacioniAkses, PerdoruesRole } from '@inventari/shared'
import type { TenantConfig } from '@inventari/shared'

export type UiLloji = 'legacy_fixed' | 'dynamic'

export type LocationAccessEntry = {
  lokacioni_id: string
  akses: LokacioniAkses
}

export type SessionUser = {
  id: string
  email: string | null
  emri: string | null
  uiLloji: UiLloji
  isLegacy: boolean
  has_locations: boolean
  tenantConfig: TenantConfig | null
  role: PerdoruesRole
  accountOwnerId: string
  locationAccess: LocationAccessEntry[]
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  track_price: true,
  onboarding_complete: false,
  tutorial_seen: false,
}
