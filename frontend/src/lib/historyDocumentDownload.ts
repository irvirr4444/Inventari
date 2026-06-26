import type { ActionBatch } from './api'
import { API_BASE } from './api/http'
import { fetchAllActionBatches } from './fetchAllActionBatches'
import { buildHistoryExportRequestBody } from './historyExportBody'
import {
  applyHistoryClientFilters,
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

export async function downloadHistoryDocument(
  format: HistoryDocumentFormat,
  opts: {
    server: HistoryServerFilters
    client: HistoryClientFilters
    trackPrice?: boolean
    batchIds?: string[]
    filterLines?: string[]
  },
): Promise<void> {
  const issues = getHistoryFilterRangeIssues(opts.server, opts.client, {
    trackPrice: opts.trackPrice,
  })
  if (issues.length > 0) {
    throw new Error(formatHistoryFilterRangeIssuesMessage(issues))
  }

  let filtered: ActionBatch[]
  if (opts.batchIds && opts.batchIds.length > 0) {
    filtered = opts.batchIds.map((id) => ({ id }) as ActionBatch)
  } else {
    const allBatches = await fetchAllActionBatches(opts.server)
    filtered = applyHistoryClientFilters(allBatches, opts.client, {
      trackPrice: opts.trackPrice,
    })
    if (filtered.length === 0) {
      throw new Error('Nuk u gjet asnje veprim per eksport.')
    }
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
        filtered,
        filterLines: opts.filterLines,
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
  triggerBlobDownload(blob, filename)
}
