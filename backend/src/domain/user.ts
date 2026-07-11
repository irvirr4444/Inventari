import type { LokacioniAkses, PerdoruesRole } from '@inventari/shared'

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
  role: PerdoruesRole
  accountOwnerId: string
  locationAccess: LocationAccessEntry[]
}

export type PerdoruesRow = {
  id: string
  email: string | null
  password_hash: string | null
  emri: string | null
  google_sub: string | null
  ui_lloji: UiLloji
  is_legacy: boolean
  krijuar_at: string
  aktiv: boolean
  account_owner_id: string
  role: PerdoruesRole
}

export const LEGACY_USER_ID = '00000000-0000-4000-8000-000000000001'
