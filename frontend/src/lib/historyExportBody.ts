import type { ActionBatch } from './api'
import type { HistoryClientFilters, HistoryServerFilters } from './historyClientFilters'
import { formatHistoryPrintFilterSummary } from './historyFilterSearchParams'
import { resolveHistoriLocationExportLabel } from './historiFilterSelection'

export function resolveHistoryExportLocationLabel(
  filtered: ActionBatch[],
  locationIds: string[],
): string | undefined {
  if (locationIds.length === 0) return undefined
  const locationId = locationIds[0]
  return (
    filtered.find((batch) => batch.lokacioni_id === locationId)?.lokacioni_emri ??
    filtered.find((batch) => batch.destination_lokacioni_id === locationId)
      ?.destination_lokacioni_emri ??
    locationId
  )
}

export function buildHistoryExportRequestBody(opts: {
  server: HistoryServerFilters
  client: HistoryClientFilters
  trackPrice?: boolean
  filtered: ActionBatch[]
  filterLines?: string[]
  locations?: { id: string; emri: string }[]
}) {
  const locationLabel =
    opts.locations && opts.locations.length > 0
      ? resolveHistoriLocationExportLabel(opts.client.locationIds, opts.locations)
      : resolveHistoryExportLocationLabel(opts.filtered, opts.client.locationIds)

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
    batchIds: opts.filtered.map((batch) => batch.id),
    lloji: opts.server.lloji,
    llojet:
      llojet.length > 0 && llojet.length < 3 ? llojet : undefined,
    shteti: opts.server.shteti,
    dateFrom: opts.server.dateFrom,
    dateTo: opts.server.dateTo,
    shenim: opts.server.shenim,
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
