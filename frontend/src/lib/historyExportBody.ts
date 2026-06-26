import type { ActionBatch } from './api'
import type { HistoryClientFilters, HistoryServerFilters } from './historyClientFilters'
import { formatHistoryPrintFilterSummary } from './historyFilterSearchParams'

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
}) {
  const locationLabel = resolveHistoryExportLocationLabel(
    opts.filtered,
    opts.client.locationIds,
  )

  const filterLines =
    opts.filterLines ??
    formatHistoryPrintFilterSummary(opts.server, opts.client, {
      trackPrice: opts.trackPrice,
      locationLabel,
    })

  return {
    batchIds: opts.filtered.map((batch) => batch.id),
    lloji: opts.server.lloji,
    shteti: opts.server.shteti,
    dateFrom: opts.server.dateFrom,
    dateTo: opts.server.dateTo,
    shenim: opts.server.shenim,
    locationId: opts.client.locationIds[0],
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
