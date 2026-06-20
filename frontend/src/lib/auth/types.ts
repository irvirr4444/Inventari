export type UiLloji = 'legacy_fixed' | 'dynamic'

export type SessionUser = {
  id: string
  email: string | null
  emri: string | null
  uiLloji: UiLloji
  isLegacy: boolean
  has_locations: boolean
}
