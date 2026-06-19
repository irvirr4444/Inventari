import type { Country } from '@inventari/shared'
import type { LokacioniRow } from '../domain/lokacioni.js'
import type { ProduktiRow } from '../repositories/produktiRepository.js'
import type { SessionUser } from '../domain/user.js'
import { LEGACY_LOKACIONI_AL_ID, LEGACY_LOKACIONI_XK_ID } from '../domain/lokacioni.js'

export type LegacyProduktiDto = Omit<ProduktiRow, 'pronari_id'>

export type DynamicStockEntry = { lokacioni_id: string; sasia: number }

export type DynamicProduktiDto = {
  id: string
  kodi: string
  emri: string
  stock: DynamicStockEntry[]
  created_at?: string
  updated_at?: string
}

export function toLegacyProductDto(row: ProduktiRow): LegacyProduktiDto {
  const { pronari_id: _owner, ...rest } = row
  return rest
}

export function toDynamicProductDto(
  row: ProduktiRow,
  stock: DynamicStockEntry[],
): DynamicProduktiDto {
  return {
    id: row.id,
    kodi: row.kodi,
    emri: row.emri,
    stock,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function mapProductResponse(
  user: SessionUser,
  row: ProduktiRow,
  stockRows: DynamicStockEntry[],
): LegacyProduktiDto | DynamicProduktiDto {
  if (user.isLegacy) return toLegacyProductDto(row)
  return toDynamicProductDto(row, stockRows)
}

export function countryToLegacyLokacioniId(country: Country): string {
  return country === 'XK' ? LEGACY_LOKACIONI_XK_ID : LEGACY_LOKACIONI_AL_ID
}

export function resolveLokacioniIdForCountry(
  lokacionet: LokacioniRow[],
  country: Country,
): string | null {
  const match = lokacionet.find((l) => l.kodi === country)
  return match?.id ?? null
}

export function lokacioniIdToCountry(
  lokacionet: LokacioniRow[],
  lokacioniId: string | null | undefined,
): Country | null {
  if (!lokacioniId) return null
  const match = lokacionet.find((l) => l.id === lokacioniId)
  if (!match) return null
  if (match.kodi === 'XK' || match.kodi === 'AL') return match.kodi
  return null
}
