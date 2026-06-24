import type { Country } from '@inventari/shared'

export type LokacioniRow = {
  id: string
  pronari_id: string
  emri: string
  kodi: string
  flag_emoji: string | null
  rradhitja: number
  show_in_summary: boolean
  aktiv: boolean
}

export const LEGACY_LOKACIONI_XK_ID = '00000000-0000-4000-8000-000000000101'
export const LEGACY_LOKACIONI_AL_ID = '00000000-0000-4000-8000-000000000102'

export function lokacioniToCountry(
  lokacionet: Array<{ id: string; kodi: string }>,
  lokacioniId: string,
): Country {
  const match = lokacionet.find((l) => l.id === lokacioniId)
  return match?.kodi === 'AL' ? 'AL' : 'XK'
}
