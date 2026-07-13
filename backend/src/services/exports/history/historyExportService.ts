import type { SupabaseClient } from '@supabase/supabase-js'
import type { SessionUser } from '../../../domain/user.js'
import { listLokacionetByOwner } from '../../../repositories/lokacioniRepository.js'
import {
  fetchExportDynamicActions,
  fetchExportLegacyActions,
  fetchExportLegacyProducts,
  fetchLegacyVeprimet,
} from '../../../repositories/batchRepository.js'
import { listProduktet, listGjendjeForProducts } from '../../../repositories/produktiRepository.js'
import { listPerdoruesByAccount } from '../../../repositories/perdoruesRepository.js'
import { resolveInventariExcelExportConfigForTenant } from '../config/index.js'
import {
  fetchAllActionBatchesForExport,
  groupLegacyVeprimRows,
  isLegacyBatchId,
} from '../../actions/index.js'
import {
  applyHistoryExportClientFilters,
  assertHistoryExportFilterRanges,
  type HistoryExportClientFilters,
} from './historyExportFilters.js'
import {
  buildHistoryDynamicExcelBuffer,
  buildHistoryLegacyExcelBuffer,
  formatExportTimestamp,
  resolveHistoryExportSheets,
  type DynamicActionExportRow,
  type ActionExportRow,
} from '../excel/index.js'

export type HistoryExportQuery = {
  lloji?: 'Hyrje' | 'Dalje' | 'Transfer'
  llojet?: ('Hyrje' | 'Dalje' | 'Transfer')[]
  shteti?: 'XK' | 'AL'
  dateFrom?: string
  dateTo?: string
  shenim?: string
  locationId?: string
  locationIds?: string[]
  oraFrom?: string
  oraDeri?: string
  pershkrimi?: string
  totaliMin?: number
  totaliMax?: number
  produkteMin?: number
  produkteMax?: number
  kodiProduktit?: string
  trackPrice?: boolean
  batchIds?: string[]
  locationLabel?: string
  filterLines?: string[]
}

async function resolveAllowedActionIds(
  supabase: SupabaseClient,
  tenantId: string,
  filteredBatches: { id: string }[],
  allActions: Array<{ id: string; batch_id?: string | null; kodi_produktit?: string }>,
  query: Pick<HistoryExportQuery, 'dateFrom' | 'dateTo' | 'shteti' | 'kodiProduktit'>,
): Promise<Set<string>> {
  const allowed = new Set<string>()
  const productCode = query.kodiProduktit?.trim() || undefined
  const matchesProduct = (kodi?: string) => !productCode || kodi === productCode
  const realBatchIds = new Set(
    filteredBatches.map((batch) => batch.id).filter((id) => !isLegacyBatchId(id)),
  )
  const legacyBatchIds = new Set(
    filteredBatches.filter((batch) => isLegacyBatchId(batch.id)).map((batch) => batch.id),
  )

  if (legacyBatchIds.size > 0) {
    const legacyRows = await fetchLegacyVeprimet(supabase, tenantId, {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      shteti: query.shteti,
    })
    for (const group of groupLegacyVeprimRows(legacyRows)) {
      if (!legacyBatchIds.has(group.id)) continue
      for (const row of group.rows) {
        if (matchesProduct(row.kodi_produktit)) allowed.add(row.id)
      }
    }
  }

  for (const action of allActions) {
    if (action.batch_id && realBatchIds.has(action.batch_id)) {
      if (matchesProduct(action.kodi_produktit)) allowed.add(action.id)
    }
  }

  return allowed
}

export async function exportHistoryXlsx(
  supabase: SupabaseClient,
  user: SessionUser,
  query: HistoryExportQuery,
) {
  assertHistoryExportFilterRanges(query)

  const serverQuery = {
    lloji: query.lloji,
    shteti: query.shteti,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    shenim: query.shenim,
  }

  const clientFilters: HistoryExportClientFilters = {
    locationId: query.locationId,
    locationIds: query.locationIds,
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
  const filteredBatches =
    query.batchIds && query.batchIds.length > 0
      ? (() => {
          const allowedIds = new Set(query.batchIds)
          return batches.filter((batch) => allowedIds.has(batch.id))
        })()
      : applyHistoryExportClientFilters(batches, clientFilters)
  const dateQuery = { from: query.dateFrom, to: query.dateTo }
  const actionFilterQuery = {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    shteti: query.shteti,
    kodiProduktit: query.kodiProduktit,
  }

  if (!user.isLegacy) {
    const lokacionet = await listLokacionetByOwner(supabase, user.id)
    const locations = lokacionet.map((l) => ({ key: l.id, emri: l.emri }))
    const locationKeys =
      query.locationIds && query.locationIds.length > 0
        ? query.locationIds
        : query.locationId
          ? [query.locationId]
          : []
    const exportLlojet =
      query.llojet && query.llojet.length > 0 && query.llojet.length < 3
        ? query.llojet
        : query.lloji
          ? [query.lloji]
          : undefined
    const plans = resolveHistoryExportSheets({
      lloji: query.lloji,
      llojet: exportLlojet,
      locationKeys,
      locations,
    })
    const transferLocationEmri =
      locationKeys.length === 1
        ? lokacionet.find((l) => l.id === locationKeys[0])?.emri
        : undefined

    const [productRows, allActions, users] = await Promise.all([
      listProduktet(supabase, user.id, {}),
      fetchExportDynamicActions(supabase, user.id),
      listPerdoruesByAccount(supabase, user.id),
    ])
    const allowedActionIds = await resolveAllowedActionIds(
      supabase,
      user.id,
      filteredBatches,
      allActions,
      actionFilterQuery,
    )

    const stockRows = await listGjendjeForProducts(
      supabase,
      user.id,
      productRows.map((p) => p.id),
    )
    const stockByProduct = new Map<string, Map<string, number>>()
    for (const row of stockRows) {
      const byLoc = stockByProduct.get(row.produkti_id) ?? new Map()
      byLoc.set(row.lokacioni_id, Number(row.sasia))
      stockByProduct.set(row.produkti_id, byLoc)
    }

    const creatorLabelById = new Map(
      users.map((u) => [u.id, u.emri?.trim() || u.email?.trim() || u.id]),
    )
    const excelExport = await resolveInventariExcelExportConfigForTenant(
      supabase,
      user.id,
      users,
      creatorLabelById,
    )

    const buffer = await buildHistoryDynamicExcelBuffer(
      productRows.map((p) => ({
        kodi: p.kodi,
        emri: p.emri,
        stockByLocation: stockByProduct.get(p.id) ?? new Map(),
      })),
      allActions as DynamicActionExportRow[],
      lokacionet.map((l) => l.id),
      locations,
      allowedActionIds,
      plans,
      dateQuery,
      transferLocationEmri,
      locationKeys.length > 0,
      excelExport,
    )

    return { buffer, filename: `Histori ${formatExportTimestamp()}.xlsx` }
  }

  const locations = [
    { key: 'XK', emri: 'Kosova' },
    { key: 'AL', emri: 'Shqiperi' },
  ]
  const legacyLocationKeys = query.shteti ? [query.shteti] : []
  const plans = resolveHistoryExportSheets({
    lloji: query.lloji,
    locationKeys: legacyLocationKeys,
    locations,
  })
  const transferLocationEmri = query.shteti
    ? locations.find((l) => l.key === query.shteti)?.emri
    : undefined

  const [products, allActions] = await Promise.all([
    fetchExportLegacyProducts(supabase, user.id),
    fetchExportLegacyActions(supabase, user.id),
  ])
  const allowedActionIds = await resolveAllowedActionIds(
    supabase,
    user.id,
    filteredBatches,
    allActions,
    serverQuery,
  )

  const buffer = await buildHistoryLegacyExcelBuffer(
    products,
    allActions as ActionExportRow[],
    allowedActionIds,
    plans,
    locations,
    dateQuery,
    transferLocationEmri,
  )

  return { buffer, filename: `Histori ${formatExportTimestamp()}.xlsx` }
}

export async function exportHistoryPdf(
  supabase: SupabaseClient,
  user: SessionUser,
  query: HistoryExportQuery,
) {
  const { buildHistoryReportDocument, historyReportFilename } = await import(
    './historyReportData.js'
  )
  const { buildHistoryReportPdfBuffer } = await import('./historyReportPdf.js')
  const document = await buildHistoryReportDocument(supabase, user, query)
  const buffer = await buildHistoryReportPdfBuffer(document)
  return { buffer, filename: historyReportFilename('pdf') }
}

export async function exportHistoryDocx(
  supabase: SupabaseClient,
  user: SessionUser,
  query: HistoryExportQuery,
) {
  const { buildHistoryReportDocument, historyReportFilename } = await import(
    './historyReportData.js'
  )
  const { buildHistoryReportDocxBuffer } = await import('./historyReportDocx.js')
  const document = await buildHistoryReportDocument(supabase, user, query)
  const buffer = await buildHistoryReportDocxBuffer(document)
  return { buffer, filename: historyReportFilename('docx') }
}
