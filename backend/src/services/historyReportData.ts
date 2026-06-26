import { createRequire } from 'node:module'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatOraDisplay } from '@inventari/shared'
import { isDisplayRow } from '../batchDomain.js'
import type { SessionUser } from '../domain/user.js'
import type { LokacioniRow } from '../domain/lokacioni.js'
import {
  fetchProduktiNamesByKodi,
  fetchVeprimBatchById,
  fetchVeprimetByBatchId,
} from '../repositories/batchRepository.js'
import { listLokacionetByOwner } from '../repositories/lokacioniRepository.js'
import { isLegacyBatchId, loadLegacyBatchDetail } from '../legacyBatches.js'
import { fetchAllActionBatchesForExport } from './actionBatchListService.js'
import {
  applyHistoryExportClientFilters,
  assertHistoryExportFilterRanges,
  type HistoryExportClientFilters,
} from './historyExportFilters.js'
import { formatExportTimestamp } from './inventariExcel.js'
import type { HistoryExportQuery } from './historyExportService.js'

const require = createRequire(import.meta.url)

export const DEJAVU_SANS_PATH = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf')
export const DEJAVU_SANS_BOLD_PATH = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf')

export type HistoryReportItem = {
  productLabel: string
  qty: number
  totali: number
  shenim: string | null
}

export type HistoryReportAction = {
  data: string
  ora: string
  lloji: 'Hyrje' | 'Dalje' | 'Transfer'
  route: string | null
  pershkrimi: string | null
  items: HistoryReportItem[]
  actionTotal: number
}

export type HistoryReportDocument = {
  title: string
  generatedAt: string
  filterLines: string[]
  actions: HistoryReportAction[]
  trackPrice: boolean
}

type BatchDetail = {
  id: string
  lloji: 'Hyrje' | 'Dalje' | 'Transfer'
  shteti: 'XK' | 'AL'
  destination_shteti?: 'XK' | 'AL'
  lokacioni_emri?: string
  destination_lokacioni_emri?: string
  data: string
  ora?: string | null
  pershkrimi?: string | null
  items: Array<{
    kodi_produktit: string
    emri_produktit: string
    sasia: number
    totali: number
    shenim?: string | null
  }>
}

function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function formatReportTimestamp(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year}, ${hour}:${minute}`
}

function productLabel(emri: string, kodi: string): string {
  return `${emri} (${kodi})`
}

function routeLabel(detail: BatchDetail): string | null {
  if (detail.lloji === 'Transfer') {
    const from =
      detail.lokacioni_emri ?? (detail.shteti === 'XK' ? 'Kosova' : 'Shqiperi')
    const to =
      detail.destination_lokacioni_emri ??
      (detail.destination_shteti === 'XK'
        ? 'Kosova'
        : detail.destination_shteti === 'AL'
          ? 'Shqiperi'
          : null)
    if (from && to) return `${from} → ${to}`
  }
  if (detail.lokacioni_emri) return detail.lokacioni_emri
  if (detail.shteti === 'XK') return 'Kosova'
  if (detail.shteti === 'AL') return 'Shqiperi'
  return null
}

function formatFilterLines(
  query: HistoryExportQuery,
  locationLabel?: string,
): string[] {
  const trackPrice = query.trackPrice ?? true
  const lines: string[] = []

  if (query.lloji) lines.push(`Veprime: ${query.lloji}`)
  if (locationLabel) lines.push(`Lokacioni: ${locationLabel}`)
  if (query.shteti) lines.push(`Shteti: ${query.shteti === 'XK' ? 'Kosova' : 'Shqiperi'}`)
  if (query.dateFrom || query.dateTo) {
    lines.push(`Data: ${query.dateFrom ?? '…'} – ${query.dateTo ?? '…'}`)
  }
  if (query.oraFrom || query.oraDeri) {
    lines.push(`Ora: ${query.oraFrom ?? '…'} – ${query.oraDeri ?? '…'}`)
  }
  if (query.pershkrimi?.trim()) lines.push(`Pershkrimi: "${query.pershkrimi.trim()}"`)
  if (query.shenim?.trim()) lines.push(`Shenim: "${query.shenim.trim()}"`)
  if (trackPrice && (query.totaliMin !== undefined || query.totaliMax !== undefined)) {
    lines.push(
      `Totali: ${query.totaliMin ?? '…'} – ${query.totaliMax ?? '…'} €`,
    )
  }
  if (query.produkteMin !== undefined || query.produkteMax !== undefined) {
    lines.push(
      `Produkte: ${query.produkteMin ?? '…'} – ${query.produkteMax ?? '…'}`,
    )
  }

  return lines
}

async function loadBatchDetail(
  supabase: SupabaseClient,
  tenantId: string,
  batchId: string,
  lokacioniById?: Map<string, LokacioniRow>,
): Promise<BatchDetail | null> {
  if (isLegacyBatchId(batchId)) {
    const legacy = await loadLegacyBatchDetail(supabase, tenantId, batchId)
    if ('error' in legacy) return null
    return legacy as BatchDetail
  }

  try {
    const batch = await fetchVeprimBatchById(supabase, tenantId, batchId)
    const rows = await fetchVeprimetByBatchId(supabase, tenantId, batchId)
    const displayRows = rows.filter((r) => isDisplayRow(batch, r))
    const productCodes = [...new Set(displayRows.map((r) => r.kodi_produktit))]
    const products = await fetchProduktiNamesByKodi(supabase, tenantId, productCodes)
    const namesByCode = new Map(products.map((p) => [p.kodi, p.emri]))

    const loc = batch.lokacioni_id ? lokacioniById?.get(batch.lokacioni_id) : undefined
    const dest = batch.destination_lokacioni_id
      ? lokacioniById?.get(batch.destination_lokacioni_id)
      : undefined

    return {
      id: batch.id,
      lloji: batch.lloji,
      shteti: batch.shteti,
      destination_shteti: batch.destination_shteti ?? undefined,
      lokacioni_emri: loc?.emri,
      destination_lokacioni_emri: dest?.emri,
      data: batch.data,
      ora: batch.ora ? formatOraDisplay(batch.ora) : null,
      pershkrimi: batch.pershkrimi ?? null,
      items: displayRows.map((row) => ({
        kodi_produktit: row.kodi_produktit,
        emri_produktit: namesByCode.get(row.kodi_produktit) ?? row.kodi_produktit,
        sasia: Number(row.sasia),
        totali: Number(row.totali),
        shenim: row.shenim ?? null,
      })),
    }
  } catch {
    return null
  }
}

function toReportAction(detail: BatchDetail): HistoryReportAction {
  const items = detail.items.map((item) => ({
    productLabel: productLabel(item.emri_produktit, item.kodi_produktit),
    qty: item.sasia,
    totali: item.totali,
    shenim: item.shenim?.trim() ? item.shenim.trim() : null,
  }))
  const actionTotal = items.reduce((sum, item) => sum + item.totali, 0)

  return {
    data: formatDisplayDate(detail.data),
    ora: detail.ora ? formatOraDisplay(detail.ora) : '',
    lloji: detail.lloji,
    route: routeLabel(detail),
    pershkrimi: detail.pershkrimi?.trim() ? detail.pershkrimi.trim() : null,
    items,
    actionTotal,
  }
}

export async function buildHistoryReportDocument(
  supabase: SupabaseClient,
  user: SessionUser,
  query: HistoryExportQuery,
): Promise<HistoryReportDocument> {
  assertHistoryExportFilterRanges(query)

  const trackPrice = query.trackPrice ?? true
  let lokacioniById: Map<string, LokacioniRow> | undefined
  if (!user.isLegacy) {
    const lokacionet = await listLokacionetByOwner(supabase, user.id)
    lokacioniById = new Map(lokacionet.map((l) => [l.id, l]))
  }

  let details: BatchDetail[]

  if (query.batchIds && query.batchIds.length > 0) {
    details = (
      await Promise.all(
        query.batchIds.map((batchId) =>
          loadBatchDetail(supabase, user.id, batchId, lokacioniById),
        ),
      )
    ).filter((detail): detail is BatchDetail => detail !== null)

    if (details.length === 0) {
      throw new Error('Nuk u gjet asnje veprim per eksport.')
    }
  } else {
    const serverQuery = {
      lloji: query.lloji,
      shteti: query.shteti,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      shenim: query.shenim,
    }

    const clientFilters: HistoryExportClientFilters = {
      locationId: query.locationId,
      oraFrom: query.oraFrom,
      oraDeri: query.oraDeri,
      pershkrimi: query.pershkrimi,
      totaliMin: query.totaliMin,
      totaliMax: query.totaliMax,
      produkteMin: query.produkteMin,
      produkteMax: query.produkteMax,
      trackPrice: query.trackPrice,
    }

    const batches = await fetchAllActionBatchesForExport(
      supabase,
      user.id,
      user.isLegacy,
      serverQuery,
    )

    const filteredBatches = applyHistoryExportClientFilters(batches, clientFilters)

    if (filteredBatches.length === 0) {
      throw new Error('Nuk u gjet asnje veprim per eksport.')
    }

    details = (
      await Promise.all(
        filteredBatches.map((batch) =>
          loadBatchDetail(supabase, user.id, batch.id, lokacioniById),
        ),
      )
    ).filter((detail): detail is BatchDetail => detail !== null)

    if (details.length === 0) {
      throw new Error('Nuk u gjet asnje veprim per eksport.')
    }
  }

  let locationLabel = query.locationLabel
  if (!locationLabel && query.locationId && lokacioniById) {
    locationLabel = lokacioniById.get(query.locationId)?.emri
  }

  const filterLines =
    query.filterLines ?? formatFilterLines(query, locationLabel)

  return {
    title: 'Histori e veprimeve',
    generatedAt: formatReportTimestamp(new Date()),
    filterLines,
    actions: details.map(toReportAction),
    trackPrice,
  }
}

export function historyReportFilename(ext: 'pdf' | 'docx'): string {
  return `Histori ${formatExportTimestamp()}.${ext}`
}
