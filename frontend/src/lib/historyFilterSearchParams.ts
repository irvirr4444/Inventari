import type { HistoryClientFilters, HistoryServerFilters } from './historyClientFilters'
import { EMPTY_CLIENT_FILTERS } from './historyClientFilters'

export function buildHistoryFilterSearchParams(opts: {
  server: HistoryServerFilters
  client: HistoryClientFilters
  trackPrice?: boolean
}) {
  const qs = new URLSearchParams()
  if (opts.server.lloji) qs.set('lloji', opts.server.lloji)
  if (opts.server.shteti) qs.set('shteti', opts.server.shteti)
  if (opts.server.dateFrom) qs.set('dateFrom', opts.server.dateFrom)
  if (opts.server.dateTo) qs.set('dateTo', opts.server.dateTo)
  if (opts.server.shenim) qs.set('shenim', opts.server.shenim)
  if (opts.client.locationIds[0]) qs.set('locationId', opts.client.locationIds[0])
  if (opts.client.oraFrom.trim()) qs.set('oraFrom', opts.client.oraFrom.trim())
  if (opts.client.oraDeri.trim()) qs.set('oraDeri', opts.client.oraDeri.trim())
  if (opts.client.pershkriminQuery.trim()) {
    qs.set('pershkrimi', opts.client.pershkriminQuery.trim())
  }
  if (opts.client.totaliMin !== '') qs.set('totaliMin', String(opts.client.totaliMin))
  if (opts.client.totaliMax !== '') qs.set('totaliMax', String(opts.client.totaliMax))
  if (opts.client.produkteMin !== '') qs.set('produkteMin', String(opts.client.produkteMin))
  if (opts.client.produkteMax !== '') qs.set('produkteMax', String(opts.client.produkteMax))
  if (opts.trackPrice === false) qs.set('trackPrice', 'false')
  return qs
}

function parseNumericParam(value: string | null): number | '' {
  if (!value) return ''
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : ''
}

export function parseHistoryFilterSearchParams(search: URLSearchParams): {
  server: HistoryServerFilters
  client: HistoryClientFilters
  trackPrice?: boolean
} {
  const lloji = search.get('lloji')
  const shteti = search.get('shteti')

  return {
    server: {
      lloji:
        lloji === 'Hyrje' || lloji === 'Dalje' || lloji === 'Transfer' ? lloji : undefined,
      shteti: shteti === 'XK' || shteti === 'AL' ? shteti : undefined,
      dateFrom: search.get('dateFrom') || undefined,
      dateTo: search.get('dateTo') || undefined,
      shenim: search.get('shenim') || undefined,
    },
    client: {
      ...EMPTY_CLIENT_FILTERS,
      locationIds: search.get('locationId') ? [search.get('locationId')!] : [],
      llojet: [],
      oraFrom: search.get('oraFrom') ?? '',
      oraDeri: search.get('oraDeri') ?? '',
      pershkriminQuery: search.get('pershkrimi') ?? '',
      totaliMin: parseNumericParam(search.get('totaliMin')),
      totaliMax: parseNumericParam(search.get('totaliMax')),
      produkteMin: parseNumericParam(search.get('produkteMin')),
      produkteMax: parseNumericParam(search.get('produkteMax')),
    },
    trackPrice: search.get('trackPrice') === 'false' ? false : undefined,
  }
}

export function formatHistoryPrintFilterSummary(
  server: HistoryServerFilters,
  client: HistoryClientFilters,
  options?: { trackPrice?: boolean; locationLabel?: string },
): string[] {
  const trackPrice = options?.trackPrice ?? true
  const lines: string[] = []

  const llojet =
    client.llojet.length > 0
      ? client.llojet
      : server.lloji
        ? [server.lloji]
        : []
  if (llojet.length === 1) lines.push(`Veprime: ${llojet[0]}`)
  else if (llojet.length > 1) lines.push(`Veprime: ${llojet.join(', ')}`)
  if (options?.locationLabel) lines.push(`Lokacioni: ${options.locationLabel}`)
  if (server.shteti) lines.push(`Shteti: ${server.shteti === 'XK' ? 'Kosova' : 'Shqiperi'}`)
  if (server.dateFrom || server.dateTo) {
    lines.push(`Data: ${server.dateFrom ?? '…'} – ${server.dateTo ?? '…'}`)
  }
  if (client.oraFrom.trim() || client.oraDeri.trim()) {
    lines.push(`Ora: ${client.oraFrom.trim() || '…'} – ${client.oraDeri.trim() || '…'}`)
  }
  if (client.pershkriminQuery.trim()) {
    lines.push(`Përshkrimi: "${client.pershkriminQuery.trim()}"`)
  }
  if (server.shenim?.trim()) lines.push(`Shenim: "${server.shenim.trim()}"`)
  if (trackPrice && (client.totaliMin !== '' || client.totaliMax !== '')) {
    lines.push(
      `Totali: ${client.totaliMin !== '' ? client.totaliMin : '…'} – ${client.totaliMax !== '' ? client.totaliMax : '…'} €`,
    )
  }
  if (client.produkteMin !== '' || client.produkteMax !== '') {
    lines.push(
      `Produkte: ${client.produkteMin !== '' ? client.produkteMin : '…'} – ${client.produkteMax !== '' ? client.produkteMax : '…'}`,
    )
  }

  return lines
}
