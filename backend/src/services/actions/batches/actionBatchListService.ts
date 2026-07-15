import type { SupabaseClient } from '@supabase/supabase-js'
import type { BatchLloji, Country } from '@inventari/shared'
import { formatOraDisplay } from '@inventari/shared'
import { buildMatchedItems, shenimMatches } from '../../../domain/batchShenimFilter.js'
import { isDisplayRow } from '../../../domain/actionBatch.js'
import {
  fetchProduktiNamesByKodi,
  fetchVeprimBatchesFiltered,
  fetchVeprimetByBatchIds,
} from '../../../repositories/batchRepository.js'
import { lokacionetByIdForHistory } from '../../../repositories/lokacioniRepository.js'
import type { LokacioniRow } from '../../../domain/lokacioni.js'
import { fetchLegacyActionBatches, mergeAndPaginateActions } from './legacyBatches.js'
import type { HistoryExportBatch } from '../../exports/index.js'

type VeprimBatchRow = {
  id: string
  lloji: BatchLloji
  data: string
  shteti: Country
  destination_shteti: Country | null
  lokacioni_id: string | null
  destination_lokacioni_id: string | null
  ora: string | null
  pershkrimi: string | null
  created_at: string
}

type VeprimRow = {
  id: string
  batch_id: string | null
  lloji: 'Hyrje' | 'Dalje'
  shteti: Country
  kodi_produktit: string
  sasia: number
  totali: number | string
  shenim?: string | null
}

function aggregateBatch(
  batch: VeprimBatchRow,
  rows: VeprimRow[],
  lokacioniById?: Map<string, LokacioniRow>,
): HistoryExportBatch {
  const displayRows = rows.filter((r) => isDisplayRow(batch, r))
  const totali = displayRows.reduce((sum, r) => sum + Number(r.totali ?? 0), 0)
  const base: HistoryExportBatch = {
    id: batch.id,
    lloji: batch.lloji,
    shteti: batch.shteti,
    destination_shteti: batch.destination_shteti ?? undefined,
    lokacioni_id: batch.lokacioni_id ?? undefined,
    destination_lokacioni_id: batch.destination_lokacioni_id ?? undefined,
    data: batch.data,
    ora: batch.ora ? formatOraDisplay(batch.ora) : null,
    pershkrimi: batch.pershkrimi ?? null,
    totali,
    created_at: batch.created_at,
    item_count: displayRows.length,
  }

  if (!lokacioniById) return base

  const loc = batch.lokacioni_id ? lokacioniById.get(batch.lokacioni_id) : undefined
  void loc
  return base
}

export async function fetchAllActionBatchesForExport(
  supabase: SupabaseClient,
  tenantId: string,
  isLegacy: boolean,
  query: {
    lloji?: BatchLloji
    shteti?: Country
    dateFrom?: string
    dateTo?: string
    shenim?: string
  },
  opts?: { maxBatches?: number },
): Promise<HistoryExportBatch[]> {
  const shenimQuery = query.shenim?.trim() || undefined
  const maxBatches = opts?.maxBatches

  let lokacioniById: Map<string, LokacioniRow> | undefined
  if (!isLegacy) {
    lokacioniById = await lokacionetByIdForHistory(supabase, tenantId)
  }

  let batchedActions: HistoryExportBatch[] = []
  try {
    const batchList = (await fetchVeprimBatchesFiltered(supabase, tenantId, {
      lloji: query.lloji,
      shteti: query.shteti,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    })) as VeprimBatchRow[]

    // Fail before fetching every veprimi row when the raw batch set is already too large
    // (skip when shenim filtering may shrink the set further).
    if (maxBatches !== undefined && !shenimQuery && batchList.length > maxBatches) {
      const { AppError } = await import('../../../errors.js')
      throw new AppError(
        400,
        `Shume veprime per eksport (${batchList.length}). Maksimumi eshte ${maxBatches}. Ngushto filtrat.`,
      )
    }

    const batchIds = batchList.map((b) => b.id)
    const rowsByBatch = new Map<string, VeprimRow[]>()
    if (batchIds.length > 0) {
      const allRows = (await fetchVeprimetByBatchIds(supabase, tenantId, batchIds)) as VeprimRow[]
      for (const row of allRows) {
        if (!row.batch_id) continue
        const list = rowsByBatch.get(row.batch_id) ?? []
        list.push(row)
        rowsByBatch.set(row.batch_id, list)
      }
    }

    if (shenimQuery) {
      const matchesByBatchId = new Map<string, VeprimRow[]>()

      for (const batch of batchList) {
        const rows = rowsByBatch.get(batch.id) ?? []
        const displayRows = rows.filter((r) => isDisplayRow(batch, r))
        const matching = displayRows.filter((r) => shenimMatches(r.shenim, shenimQuery))
        if (matching.length === 0) continue
        matchesByBatchId.set(batch.id, matching)
      }

      batchedActions = batchList
        .filter((batch) => matchesByBatchId.has(batch.id))
        .map((batch) => aggregateBatch(batch, rowsByBatch.get(batch.id) ?? [], lokacioniById))
    } else {
      batchedActions = batchList.map((batch) =>
        aggregateBatch(batch, rowsByBatch.get(batch.id) ?? [], lokacioniById),
      )
    }
  } catch (error) {
    const err = error as { message?: string; code?: string; statusCode?: number }
    if (err.statusCode === 400) throw error
    if (!err.message?.includes('veprim_batch') && err.code !== '42P01') {
      throw error
    }
  }

  const legacyActions = await fetchLegacyActionBatches(supabase, tenantId, {
    lloji: query.lloji,
    shteti: query.shteti,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    shenim: shenimQuery,
  })

  const { actions } = mergeAndPaginateActions(
    [...batchedActions, ...legacyActions],
    1,
    Number.MAX_SAFE_INTEGER,
  )

  if (maxBatches !== undefined && actions.length > maxBatches) {
    const { AppError } = await import('../../../errors.js')
    throw new AppError(
      400,
      `Shume veprime per eksport (${actions.length}). Maksimumi eshte ${maxBatches}. Ngushto filtrat.`,
    )
  }

  return actions as HistoryExportBatch[]
}
