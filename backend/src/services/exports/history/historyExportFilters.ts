import { normalizeOraInput } from '@inventari/shared'
import { AppError } from '../../../errors.js'

export const HISTORY_EXPORT_RANGE_MESSAGES = {
  date: '«Nga» duhet të jetë para «Deri».',
  ora: 'Orari i parë duhet të jetë para orarit të dytë.',
  totali: 'Totali minimal nuk mund të jetë më i madh se maksimali.',
  produkte: 'Numri minimal i produkteve nuk mund të jetë më i madh se maksimali.',
} as const

export type HistoryExportRangeQuery = {
  dateFrom?: string
  dateTo?: string
  oraFrom?: string
  oraDeri?: string
  totaliMin?: number
  totaliMax?: number
  produkteMin?: number
  produkteMax?: number
  trackPrice?: boolean
}

export function assertHistoryExportFilterRanges(query: HistoryExportRangeQuery): void {
  const trackPrice = query.trackPrice ?? true

  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
    throw new AppError(400, HISTORY_EXPORT_RANGE_MESSAGES.date)
  }

  const oraFrom = normalizeOraInput(query.oraFrom)
  const oraDeri = normalizeOraInput(query.oraDeri)
  if (oraFrom !== undefined && oraDeri !== undefined && oraFrom > oraDeri) {
    throw new AppError(400, HISTORY_EXPORT_RANGE_MESSAGES.ora)
  }

  if (
    trackPrice &&
    query.totaliMin !== undefined &&
    query.totaliMax !== undefined &&
    query.totaliMin > query.totaliMax
  ) {
    throw new AppError(400, HISTORY_EXPORT_RANGE_MESSAGES.totali)
  }

  if (
    query.produkteMin !== undefined &&
    query.produkteMax !== undefined &&
    query.produkteMin > query.produkteMax
  ) {
    throw new AppError(400, HISTORY_EXPORT_RANGE_MESSAGES.produkte)
  }
}

export type HistoryExportBatch = {
  id: string
  lloji: 'Hyrje' | 'Dalje' | 'Transfer'
  shteti: 'XK' | 'AL'
  destination_shteti?: 'XK' | 'AL'
  lokacioni_id?: string
  destination_lokacioni_id?: string
  data: string
  ora?: string | null
  pershkrimi?: string | null
  totali: number
  item_count: number
  created_at: string
}

export type HistoryExportClientFilters = {
  locationId?: string
  locationIds?: string[]
  llojet?: ('Hyrje' | 'Dalje' | 'Transfer')[]
  oraFrom?: string
  oraDeri?: string
  pershkrimi?: string
  totaliMin?: number
  totaliMax?: number
  produkteMin?: number
  produkteMax?: number
  trackPrice?: boolean
}

function batchMatchesLocation(batch: HistoryExportBatch, locationId: string): boolean {
  if (batch.lloji === 'Transfer') {
    return (
      batch.lokacioni_id === locationId || batch.destination_lokacioni_id === locationId
    )
  }
  return batch.lokacioni_id === locationId
}

function batchMatchesAnyLocation(batch: HistoryExportBatch, locationIds: string[]): boolean {
  return locationIds.some((locationId) => batchMatchesLocation(batch, locationId))
}

export function applyHistoryExportClientFilters(
  batches: HistoryExportBatch[],
  filters: HistoryExportClientFilters,
): HistoryExportBatch[] {
  const trackPrice = filters.trackPrice ?? true
  const oraFrom = normalizeOraInput(filters.oraFrom)
  const oraDeri = normalizeOraInput(filters.oraDeri)
  const pershkrimi = filters.pershkrimi?.trim().toLowerCase() ?? ''
  const locationIds = (
    filters.locationIds?.length
      ? filters.locationIds
      : filters.locationId?.trim()
        ? [filters.locationId.trim()]
        : []
  ).filter(Boolean)

  const hasOra = oraFrom !== undefined || oraDeri !== undefined
  const hasPershkrimi = pershkrimi !== ''
  const hasTotali =
    trackPrice && (filters.totaliMin !== undefined || filters.totaliMax !== undefined)
  const hasProdukte = filters.produkteMin !== undefined || filters.produkteMax !== undefined

  if (locationIds.length === 0 && !hasOra && !hasPershkrimi && !hasTotali && !hasProdukte) {
    return batches
  }

  return batches.filter((batch) => {
    if (locationIds.length > 0 && !batchMatchesAnyLocation(batch, locationIds)) return false

    if (hasOra) {
      const batchOra = normalizeOraInput(batch.ora)
      if (batchOra === undefined) return false
      if (oraFrom !== undefined && batchOra < oraFrom) return false
      if (oraDeri !== undefined && batchOra > oraDeri) return false
    }

    if (hasPershkrimi) {
      const text = (batch.pershkrimi ?? '').toLowerCase()
      if (!text.includes(pershkrimi)) return false
    }

    if (hasTotali) {
      if (filters.totaliMin !== undefined && batch.totali < filters.totaliMin) return false
      if (filters.totaliMax !== undefined && batch.totali > filters.totaliMax) return false
    }

    if (filters.produkteMin !== undefined && batch.item_count < filters.produkteMin) return false
    if (filters.produkteMax !== undefined && batch.item_count > filters.produkteMax) return false

    return true
  })
}
