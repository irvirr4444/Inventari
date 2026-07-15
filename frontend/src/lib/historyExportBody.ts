import type { HistoryClientFilters, HistoryServerFilters } from './historyClientFilters'
import { formatHistoryPrintFilterSummary } from './historyFilterSearchParams'
import { resolveHistoriLocationExportLabel } from './historiFilterSelection'

export function buildHistoryExportRequestBody(opts: {
  server: HistoryServerFilters
  client: HistoryClientFilters
  trackPrice?: boolean
  batchIds?: string[]
  filterLines?: string[]
  locations?: { id: string; emri: string }[]
  locationLabel?: string
}) {
  const locationLabel =
    opts.locationLabel ??
    (opts.locations && opts.locations.length > 0
      ? resolveHistoriLocationExportLabel(opts.client.locationIds, opts.locations)
      : undefined)

  const llojet =
    opts.client.llojet.length > 0
      ? opts.client.llojet
      : opts.server.lloji
        ? [opts.server.lloji]
        : []

  const filterLines =
    opts.filterLines ??
    formatHistoryPrintFilterSummary(opts.server, opts.client, {
      trackPrice: opts.trackPrice,
      locationLabel,
    })

  return {
    ...(opts.batchIds && opts.batchIds.length > 0 ? { batchIds: opts.batchIds } : {}),
    lloji: opts.server.lloji,
    llojet: llojet.length > 0 && llojet.length < 3 ? llojet : undefined,
    shteti: opts.server.shteti,
    dateFrom: opts.server.dateFrom,
    dateTo: opts.server.dateTo,
    shenim: opts.server.shenim,
    kodiProduktit: opts.server.kodiProduktit?.trim() || undefined,
    locationIds:
      opts.client.locationIds.length > 0 ? opts.client.locationIds : undefined,
    locationId: opts.client.locationIds.length === 1 ? opts.client.locationIds[0] : undefined,
    oraFrom: opts.client.oraFrom.trim() || undefined,
    oraDeri: opts.client.oraDeri.trim() || undefined,
    pershkrimi: opts.client.pershkriminQuery.trim() || undefined,
    totaliMin: opts.client.totaliMin !== '' ? opts.client.totaliMin : undefined,
    totaliMax: opts.client.totaliMax !== '' ? opts.client.totaliMax : undefined,
    produkteMin: opts.client.produkteMin !== '' ? opts.client.produkteMin : undefined,
    produkteMax: opts.client.produkteMax !== '' ? opts.client.produkteMax : undefined,
    trackPrice: opts.trackPrice,
    locationLabel,
    filterLines,
  }
}
