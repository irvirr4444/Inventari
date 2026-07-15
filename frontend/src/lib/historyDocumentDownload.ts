import { API_BASE } from './api/http'
import { buildHistoryExportRequestBody } from './historyExportBody'
import {
  formatHistoryFilterRangeIssuesMessage,
  getHistoryFilterRangeIssues,
  type HistoryClientFilters,
  type HistoryServerFilters,
} from './historyClientFilters'

export type HistoryDocumentFormat = 'xlsx' | 'pdf' | 'docx'

const DEFAULT_FILENAMES: Record<HistoryDocumentFormat, string> = {
  xlsx: 'Histori.xlsx',
  pdf: 'Histori.pdf',
  docx: 'Histori.docx',
}

function parseContentDispositionFilename(header: string | null): string | undefined {
  if (!header) return undefined
  const match = header.match(/filename="([^"]+)"/)
  return match?.[1]
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export type HistoryDocumentExportOpts = {
  server: HistoryServerFilters
  client: HistoryClientFilters
  trackPrice?: boolean
  /** When set, backend exports only these batches. Otherwise filters select batches server-side. */
  batchIds?: string[]
  filterLines?: string[]
  locations?: { id: string; emri: string }[]
  locationLabel?: string
}

async function fetchHistoryDocumentBlob(
  format: HistoryDocumentFormat,
  opts: HistoryDocumentExportOpts,
): Promise<{ blob: Blob; filename: string }> {
  const issues = getHistoryFilterRangeIssues(opts.server, opts.client, {
    trackPrice: opts.trackPrice,
  })
  if (issues.length > 0) {
    throw new Error(formatHistoryFilterRangeIssuesMessage(issues))
  }

  const res = await fetch(`${API_BASE}/exports/history.${format}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      buildHistoryExportRequestBody({
        server: opts.server,
        client: opts.client,
        trackPrice: opts.trackPrice,
        batchIds: opts.batchIds,
        filterLines: opts.filterLines,
        locations: opts.locations,
        locationLabel: opts.locationLabel,
      }),
    ),
  })

  if (!res.ok) {
    const text = await res.text()
    let message = text || `HTTP ${res.status}`
    try {
      const parsed = JSON.parse(text) as { error?: string }
      if (parsed.error) message = parsed.error
    } catch {
      /* plain text error body */
    }
    throw new Error(message)
  }

  const blob = await res.blob()
  const filename =
    parseContentDispositionFilename(res.headers.get('Content-Disposition')) ??
    DEFAULT_FILENAMES[format]
  return { blob, filename }
}

/** Fetch a history document from the backend (no client-side batch fan-out). */
export async function fetchHistoryDocument(
  format: HistoryDocumentFormat,
  opts: HistoryDocumentExportOpts,
): Promise<{ blob: Blob; filename: string; objectUrl: string }> {
  const { blob, filename } = await fetchHistoryDocumentBlob(format, opts)
  return { blob, filename, objectUrl: URL.createObjectURL(blob) }
}

export async function downloadHistoryDocument(
  format: HistoryDocumentFormat,
  opts: HistoryDocumentExportOpts,
): Promise<void> {
  const { blob, filename } = await fetchHistoryDocumentBlob(format, opts)
  triggerBlobDownload(blob, filename)
}
