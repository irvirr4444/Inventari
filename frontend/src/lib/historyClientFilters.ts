import { normalizeOraInput } from '@inventari/shared'
import type { Country } from './country'
import type { ActionBatch } from './api'

export type HistoryServerFilters = {
  lloji?: 'Hyrje' | 'Dalje' | 'Transfer'
  shteti?: Country
  dateFrom?: string
  dateTo?: string
  shenim?: string
}

export type HistoryClientFilters = {
  locationIds: string[]
  oraFrom: string
  oraDeri: string
  pershkriminQuery: string
  totaliMin: number | ''
  totaliMax: number | ''
  produkteMin: number | ''
  produkteMax: number | ''
}

export const EMPTY_CLIENT_FILTERS: HistoryClientFilters = {
  locationIds: [],
  oraFrom: '',
  oraDeri: '',
  pershkriminQuery: '',
  totaliMin: '',
  totaliMax: '',
  produkteMin: '',
  produkteMax: '',
}

export function countAdvancedHistoriFilters(
  client: HistoryClientFilters,
  server: Pick<HistoryServerFilters, 'shenim' | 'dateFrom' | 'dateTo'>,
  options?: { trackPrice?: boolean },
): number {
  const trackPrice = options?.trackPrice ?? true
  let count = 0
  if ((server.shenim?.trim() ?? '') !== '') count++
  if (server.dateFrom || server.dateTo) count++
  if (client.oraFrom.trim() !== '') count++
  if (client.oraDeri.trim() !== '') count++
  if (client.pershkriminQuery.trim() !== '') count++
  if (trackPrice && client.totaliMin !== '') count++
  if (trackPrice && client.totaliMax !== '') count++
  if (client.produkteMin !== '') count++
  if (client.produkteMax !== '') count++
  return count
}

export function advancedHistoriFilterValueLabel(count: number): string {
  if (count === 0) return 'Më shumë'
  if (count === 1) return '1 aktiv'
  return `${count} aktive`
}

export function hasActiveClientFilters(
  filters: HistoryClientFilters,
  options?: { trackPrice?: boolean },
): boolean {
  const trackPrice = options?.trackPrice ?? true
  return (
    filters.locationIds.length > 0 ||
    filters.oraFrom.trim() !== '' ||
    filters.oraDeri.trim() !== '' ||
    filters.pershkriminQuery.trim() !== '' ||
    (trackPrice && (filters.totaliMin !== '' || filters.totaliMax !== '')) ||
    filters.produkteMin !== '' ||
    filters.produkteMax !== ''
  )
}

export function hasActiveServerFilters(filters: HistoryServerFilters): boolean {
  return (
    filters.lloji !== undefined ||
    filters.shteti !== undefined ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    (filters.shenim?.trim() ?? '') !== ''
  )
}

function parseBound(value: number | ''): number | null {
  if (value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function applyHistoryClientFilters(
  batches: ActionBatch[],
  filters: HistoryClientFilters,
  options?: { trackPrice?: boolean },
): ActionBatch[] {
  const trackPrice = options?.trackPrice ?? true
  const oraFrom = normalizeOraInput(filters.oraFrom)
  const oraDeri = normalizeOraInput(filters.oraDeri)
  const pershkriminQuery = filters.pershkriminQuery.trim().toLowerCase()
  const totaliMin = parseBound(filters.totaliMin)
  const totaliMax = parseBound(filters.totaliMax)
  const produkteMin = parseBound(filters.produkteMin)
  const produkteMax = parseBound(filters.produkteMax)

  const hasOraFilter = oraFrom !== undefined || oraDeri !== undefined
  const hasPershkrimiFilter = pershkriminQuery !== ''
  const hasTotaliFilter = trackPrice && (totaliMin !== null || totaliMax !== null)
  const hasProdukteFilter = produkteMin !== null || produkteMax !== null
  const locationFilter = filters.locationIds

  if (
    locationFilter.length === 0 &&
    !hasOraFilter &&
    !hasPershkrimiFilter &&
    !hasTotaliFilter &&
    !hasProdukteFilter
  ) {
    return batches
  }

  return batches.filter((batch) => {
    if (locationFilter.length > 0) {
      const batchLoc = batch.lokacioni_id
      if (!batchLoc || !locationFilter.includes(batchLoc)) return false
    }

    if (hasOraFilter) {
      const batchOra = normalizeOraInput(batch.ora)
      if (batchOra === undefined) return false
      if (oraFrom !== undefined && batchOra < oraFrom) return false
      if (oraDeri !== undefined && batchOra > oraDeri) return false
    }

    if (hasPershkrimiFilter) {
      const text = (batch.pershkrimi ?? '').toLowerCase()
      if (!text.includes(pershkriminQuery)) return false
    }

    if (trackPrice) {
      if (totaliMin !== null && batch.totali < totaliMin) return false
      if (totaliMax !== null && batch.totali > totaliMax) return false
    }
    if (produkteMin !== null && batch.item_count < produkteMin) return false
    if (produkteMax !== null && batch.item_count > produkteMax) return false

    return true
  })
}
