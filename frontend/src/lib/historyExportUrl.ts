import type {
  HistoryClientFilters,
  HistoryServerFilters,
} from './historyClientFilters'
import { API_BASE } from './api/http'
import { buildHistoryFilterSearchParams } from './historyFilterSearchParams'

export function historyExportUrl(opts: {
  server: HistoryServerFilters
  client: HistoryClientFilters
  trackPrice?: boolean
}) {
  const query = buildHistoryFilterSearchParams(opts).toString()
  return `${API_BASE}/exports/history.xlsx${query ? `?${query}` : ''}`
}
