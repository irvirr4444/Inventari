export type UiLloji = 'legacy_fixed' | 'dynamic'

export type SessionUser = {
  id: string
  email: string
  emri: string | null
  uiLloji: UiLloji
  isLegacy: boolean
}

export type PerdoruesRow = {
  id: string
  email: string
  password_hash: string | null
  emri: string | null
  google_sub: string | null
  ui_lloji: UiLloji
  is_legacy: boolean
  krijuar_at: string
  aktiv: boolean
}

export const LEGACY_USER_ID = '00000000-0000-4000-8000-000000000001'
