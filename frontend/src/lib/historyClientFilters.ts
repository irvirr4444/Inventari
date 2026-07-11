import { normalizeOraInput } from '@inventari/shared'
import type { Country } from './country'
import type { ActionBatch } from './api'

export type HistoryServerFilters = {
  lloji?: 'Hyrje' | 'Dalje' | 'Transfer'
  shteti?: Country
  dateFrom?: string
  dateTo?: string
  shenim?: string
  kodiProduktit?: string
  createdByUserId?: string
}

export type HistoryClientFilters = {
  locationIds: string[]
  llojet: ('Hyrje' | 'Dalje' | 'Transfer')[]
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
  llojet: [],
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
  server: Pick<
    HistoryServerFilters,
    'shenim' | 'dateFrom' | 'dateTo' | 'kodiProduktit' | 'createdByUserId'
  >,
  options?: { trackPrice?: boolean },
): number {
  const trackPrice = options?.trackPrice ?? true
  let count = 0
  if ((server.shenim?.trim() ?? '') !== '') count++
  if ((server.kodiProduktit?.trim() ?? '') !== '') count++
  if ((server.createdByUserId?.trim() ?? '') !== '') count++
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
    (filters.shenim?.trim() ?? '') !== '' ||
    (filters.kodiProduktit?.trim() ?? '') !== '' ||
    (filters.createdByUserId?.trim() ?? '') !== ''
  )
}

export type HistoryFilterRangeField = 'date' | 'ora' | 'totali' | 'produkte'

export type HistoryFilterRangeIssue = {
  field: HistoryFilterRangeField
  message: string
}

export const HISTORY_FILTER_RANGE_MESSAGES = {
  date: '«Nga» duhet të jetë para «Deri».',
  ora: 'Orari i parë duhet të jetë para orarit të dytë.',
  totali: 'Totali minimal nuk mund të jetë më i madh se maksimali.',
  produkte: 'Numri minimal i produkteve nuk mund të jetë më i madh se maksimali.',
} as const

export function mergeHistoryServerFilters(
  prev: HistoryServerFilters,
  patch: Partial<HistoryServerFilters>,
): HistoryServerFilters {
  const next = { ...prev }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === '') {
      delete next[key as keyof HistoryServerFilters]
    } else {
      ;(next as Record<string, unknown>)[key] = value
    }
  }
  return next
}

export function getHistoryFilterRangeIssues(
  server: Pick<HistoryServerFilters, 'dateFrom' | 'dateTo'>,
  client: HistoryClientFilters,
  options?: { trackPrice?: boolean },
): HistoryFilterRangeIssue[] {
  const trackPrice = options?.trackPrice ?? true
  const issues: HistoryFilterRangeIssue[] = []

  if (server.dateFrom && server.dateTo && server.dateFrom > server.dateTo) {
    issues.push({ field: 'date', message: HISTORY_FILTER_RANGE_MESSAGES.date })
  }

  const oraFrom = normalizeOraInput(client.oraFrom)
  const oraDeri = normalizeOraInput(client.oraDeri)
  if (oraFrom !== undefined && oraDeri !== undefined && oraFrom > oraDeri) {
    issues.push({ field: 'ora', message: HISTORY_FILTER_RANGE_MESSAGES.ora })
  }

  const totaliMin = parseBound(client.totaliMin)
  const totaliMax = parseBound(client.totaliMax)
  if (trackPrice && totaliMin !== null && totaliMax !== null && totaliMin > totaliMax) {
    issues.push({ field: 'totali', message: HISTORY_FILTER_RANGE_MESSAGES.totali })
  }

  const produkteMin = parseBound(client.produkteMin)
  const produkteMax = parseBound(client.produkteMax)
  if (produkteMin !== null && produkteMax !== null && produkteMin > produkteMax) {
    issues.push({ field: 'produkte', message: HISTORY_FILTER_RANGE_MESSAGES.produkte })
  }

  return issues
}

export function getHistoryFilterRangeIssueMessage(
  issues: HistoryFilterRangeIssue[],
  field: HistoryFilterRangeField,
): string | undefined {
  return issues.find((issue) => issue.field === field)?.message
}

export function formatHistoryFilterRangeIssuesMessage(issues: HistoryFilterRangeIssue[]): string {
  return issues.map((issue) => issue.message).join(' ')
}

export function notifyHistoryFilterRangeIssues(
  issues: HistoryFilterRangeIssue[],
  notify?: (message: string, variant?: 'success' | 'default' | 'error') => void,
): void {
  if (issues.length === 0 || !notify) return
  notify(formatHistoryFilterRangeIssuesMessage(issues), 'error')
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
    if (filters.llojet.length > 0 && !filters.llojet.includes(batch.lloji)) {
      return false
    }

    if (locationFilter.length > 0) {
      const matchesLocation = locationFilter.some((locationId) => {
        if (batch.lloji === 'Transfer') {
          return (
            batch.lokacioni_id === locationId || batch.destination_lokacioni_id === locationId
          )
        }
        return batch.lokacioni_id === locationId
      })
      if (!matchesLocation) return false
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
