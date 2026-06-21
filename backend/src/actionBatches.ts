import type { SupabaseClient } from '@supabase/supabase-js'
import type { FastifyInstance } from 'fastify'
import {
  BatchLlojiSchema,
  CountrySchema,
  ActionBatchPatchSchema,
  ActionItemPatchSchema,
  ERR_BATCH_NOT_FOUND,
  ERR_DUPLICATE_PRODUCT_IN_ACTION,
  ERR_LAST_PRODUCT_LINE,
  ERR_MIRROR_COUNTRY_CHANGE,
  ERR_NO_UPDATE_FIELDS,
  ERR_PRODUCT_LINE_NOT_FOUND,
  ERR_TRANSFER_NEEDS_DESTINATION,
  ERR_TRANSFER_SAME_COUNTRY,
  formatOraDisplay,
  type BatchLloji,
  type Country,
} from '@inventari/shared'
import { z } from 'zod'
import { findSiblingRows, isDisplayRow, isMirroredBatch } from './batchDomain.js'
import { AppError } from './errors.js'
import {
  deleteVeprimBatchById,
  deleteVeprimiByIds,
  fetchProduktiNamesByKodi,
  fetchVeprimBatchesFiltered,
  fetchVeprimBatchById,
  fetchVeprimetByBatchId,
  fetchVeprimetByBatchIds,
  insertVeprimiRows,
  patchVeprimBatch,
  patchVeprimi,
  touchVeprimBatchUpdatedAt,
} from './repositories/batchRepository.js'
import { validateStock } from './services/actionsService.js'
import { listLokacionetByOwner } from './repositories/lokacioniRepository.js'
import type { LokacioniRow } from './domain/lokacioni.js'
import {
  deleteLegacyBatch,
  ensureRealBatchId,
  fetchLegacyActionBatches,
  isLegacyBatchId,
  loadLegacyBatchDetail,
  mergeAndPaginateActions,
} from './legacyBatches.js'

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
  updated_at: string
}

type VeprimRow = {
  id: string
  batch_id: string | null
  lloji: 'Hyrje' | 'Dalje'
  data: string
  shteti: Country
  lokacioni_id: string | null
  kodi_produktit: string
  cmimi_njesi: number | string
  sasia: number
  totali: number | string
  shenim?: string | null
  created_at: string
}

async function loadBatchRows(supabase: SupabaseClient, tenantId: string, batchId: string) {
  try {
    const batch = await fetchVeprimBatchById(supabase, tenantId, batchId)
    const rows = await fetchVeprimetByBatchId(supabase, tenantId, batchId)
    return {
      batch: batch as VeprimBatchRow,
      rows: rows as VeprimRow[],
    }
  } catch {
    return { error: ERR_BATCH_NOT_FOUND }
  }
}

function aggregateBatch(
  batch: VeprimBatchRow,
  rows: VeprimRow[],
  lokacioniById?: Map<string, LokacioniRow>,
) {
  const displayRows = rows.filter((r) => isDisplayRow(batch, r))
  const totali = displayRows.reduce((sum, r) => sum + Number(r.totali ?? 0), 0)
  const base = {
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
  const dest = batch.destination_lokacioni_id
    ? lokacioniById.get(batch.destination_lokacioni_id)
    : undefined

  return {
    ...base,
    lokacioni_emri: loc?.emri,
    destination_lokacioni_emri: dest?.emri,
    flag_emoji: loc?.flag_emoji ?? undefined,
    destination_flag_emoji: dest?.flag_emoji ?? undefined,
  }
}

function lokacioniToCountry(lokacionet: LokacioniRow[], lokacioniId: string): Country {
  const match = lokacionet.find((l) => l.id === lokacioniId)
  return match?.kodi === 'AL' ? 'AL' : 'XK'
}

type BatchItemInput = {
  kodi_produktit: string
  cmimi_njesi: number
  sasia: number
  shenim?: string | null
}

function buildBatchItemInsertRows(
  batch: VeprimBatchRow,
  rows: VeprimRow[],
  item: BatchItemInput,
  tenantId: string,
): Record<string, unknown>[] {
  const base = {
    batch_id: batch.id,
    data: batch.data,
    kodi_produktit: item.kodi_produktit,
    cmimi_njesi: item.cmimi_njesi,
    sasia: item.sasia,
    shenim: item.shenim?.trim() ? item.shenim.trim() : null,
    pronari_id: tenantId,
  }

  if (batch.lloji === 'Transfer') {
    if (!batch.destination_shteti) throw new AppError(400, ERR_TRANSFER_NEEDS_DESTINATION)
    return [
      { ...base, lloji: 'Dalje', shteti: batch.shteti },
      { ...base, lloji: 'Hyrje', shteti: batch.destination_shteti },
    ]
  }

  if (batch.lloji === 'Dalje' && batch.shteti === 'XK' && isMirroredBatch(batch, rows)) {
    return [
      { ...base, lloji: 'Dalje', shteti: 'XK' },
      { ...base, lloji: 'Hyrje', shteti: 'AL' },
    ]
  }

  return [{ ...base, lloji: batch.lloji, shteti: batch.shteti }]
}

function displayRowFromInserted(
  batch: VeprimBatchRow,
  inserted: { id: string; lloji: string; shteti: Country }[],
) {
  if (batch.lloji === 'Transfer') {
    return inserted.find((r) => r.lloji === 'Dalje' && r.shteti === batch.shteti)
  }
  return inserted.find((r) => r.lloji === batch.lloji && r.shteti === batch.shteti)
}

async function touchBatchUpdatedAt(supabase: SupabaseClient, tenantId: string, batchId: string) {
  await touchVeprimBatchUpdatedAt(supabase, tenantId, batchId)
}

export function registerActionBatchRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get('/api/action-batches', async (req) => {
    const tenantId = req.user.id
    const isLegacy = req.user.isLegacy
    const query = z
      .object({
        page: z.coerce.number().int().positive().optional().default(1),
        limit: z.coerce.number().int().positive().max(100).optional().default(20),
        lloji: BatchLlojiSchema.optional(),
        shteti: CountrySchema.optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
      .parse((req.query ?? {}) as Record<string, unknown>)

    let lokacioniById: Map<string, LokacioniRow> | undefined
    if (!isLegacy) {
      const lokacionet = await listLokacionetByOwner(supabase, tenantId)
      lokacioniById = new Map(lokacionet.map((l) => [l.id, l]))
    }

    let batchedActions: ReturnType<typeof aggregateBatch>[] = []
    try {
      const batchList = (await fetchVeprimBatchesFiltered(supabase, tenantId, {
        lloji: query.lloji,
        shteti: query.shteti,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      })) as VeprimBatchRow[]

      const batchIds = batchList.map((b) => b.id)
      const rowsByBatch = new Map<string, VeprimRow[]>()
      if (batchIds.length > 0) {
        const allRows = (await fetchVeprimetByBatchIds(
          supabase,
          tenantId,
          batchIds,
        )) as VeprimRow[]

        for (const row of allRows) {
          if (!row.batch_id) continue
          const list = rowsByBatch.get(row.batch_id) ?? []
          list.push(row)
          rowsByBatch.set(row.batch_id, list)
        }
      }

      batchedActions = batchList.map((batch) =>
        aggregateBatch(batch, rowsByBatch.get(batch.id) ?? [], lokacioniById),
      )
    } catch (error) {
      const err = error as { message?: string; code?: string }
      if (!err.message?.includes('veprim_batch') && err.code !== '42P01') {
        throw error
      }
    }

    const legacyActions = await fetchLegacyActionBatches(supabase, tenantId, {
      lloji: query.lloji,
      shteti: query.shteti,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    })

    const { actions, total } = mergeAndPaginateActions(
      [...batchedActions, ...legacyActions],
      query.page,
      query.limit,
    )

    return { actions, total }
  })

  app.get('/api/action-batches/:id', async (req, reply) => {
    const tenantId = req.user.id
    const params = z.object({ id: z.string().min(1) }).parse(req.params)

    if (isLegacyBatchId(params.id)) {
      const legacy = await loadLegacyBatchDetail(supabase, tenantId, params.id)
      if ('error' in legacy) {
        reply.code(404)
        return { error: legacy.error }
      }
      return legacy
    }

    if (!z.string().uuid().safeParse(params.id).success) {
      reply.code(404)
      return { error: 'Veprimi nuk u gjet.' }
    }

    const loaded = await loadBatchRows(supabase, tenantId, params.id)
    if ('error' in loaded) {
      reply.code(404)
      return { error: loaded.error }
    }

    const { batch, rows } = loaded
    const displayRows = rows.filter((r) => isDisplayRow(batch, r))
    const productCodes = [...new Set(displayRows.map((r) => r.kodi_produktit))]

    const products = await fetchProduktiNamesByKodi(supabase, tenantId, productCodes)
    const namesByCode = new Map(products.map((p) => [p.kodi, p.emri]))

    const items = displayRows.map((row) => ({
      id: row.id,
      kodi_produktit: row.kodi_produktit,
      emri_produktit: namesByCode.get(row.kodi_produktit) ?? row.kodi_produktit,
      cmimi_njesi: Number(row.cmimi_njesi),
      sasia: Number(row.sasia),
      totali: Number(row.totali),
      shenim: row.shenim ?? null,
    }))

    let lokacioniById: Map<string, LokacioniRow> | undefined
    if (!req.user.isLegacy) {
      const lokacionet = await listLokacionetByOwner(supabase, tenantId)
      lokacioniById = new Map(lokacionet.map((l) => [l.id, l]))
    }

    const base = aggregateBatch(batch, rows, lokacioniById)
    return {
      ...base,
      items,
      mirrored_to_albania: isMirroredBatch(batch, rows),
    }
  })

  app.patch('/api/action-batches/:id', async (req, reply) => {
    const tenantId = req.user.id
    const params = z.object({ id: z.string().min(1) }).parse(req.params)
    const body = ActionBatchPatchSchema.parse(req.body ?? {})

    const ensured = await ensureRealBatchId(supabase, tenantId, params.id, {
      data: body.data,
      shteti: body.shteti,
      destination_shteti: body.destination_shteti,
      ora: body.ora,
      pershkrimi: body.pershkrimi,
    })
    if ('error' in ensured) {
      reply.code(ensured.error.includes('nuk u gjet') ? 404 : 400)
      return { error: ensured.error }
    }
    const batchId = ensured.id

    const loaded = await loadBatchRows(supabase, tenantId, batchId)
    if ('error' in loaded) {
      reply.code(404)
      return { error: loaded.error }
    }

    const { batch, rows } = loaded
    const mirrored = isMirroredBatch(batch, rows)

    if (mirrored && (body.shteti || body.destination_shteti)) {
      reply.code(400)
      return { error: ERR_MIRROR_COUNTRY_CHANGE }
    }

    const dataChanged = Boolean(body.data && body.data !== batch.data)
    const oraChanged = body.ora !== undefined && body.ora !== batch.ora
    const pershkrimiChanged =
      body.pershkrimi !== undefined && (body.pershkrimi ?? null) !== (batch.pershkrimi ?? null)

    const batchPatch: Record<string, unknown> = {}
    if (dataChanged) batchPatch.data = body.data
    if (oraChanged) batchPatch.ora = body.ora
    if (pershkrimiChanged) batchPatch.pershkrimi = body.pershkrimi ?? null

    let routeChanged = false

    if (
      !req.user.isLegacy &&
      (body.lokacioni_id !== undefined || body.destination_lokacioni_id !== undefined)
    ) {
      const lokacionet = await listLokacionetByOwner(supabase, tenantId)
      const nextLokacioniId = body.lokacioni_id ?? batch.lokacioni_id
      const nextDestLokacioniId =
        batch.lloji === 'Transfer'
          ? body.destination_lokacioni_id ?? batch.destination_lokacioni_id
          : batch.destination_lokacioni_id

      if (batch.lloji === 'Transfer') {
        if (!nextDestLokacioniId) {
          reply.code(400)
          return { error: ERR_TRANSFER_NEEDS_DESTINATION }
        }
        if (nextDestLokacioniId === nextLokacioniId) {
          reply.code(400)
          return { error: ERR_TRANSFER_SAME_COUNTRY }
        }
      }

      const lokacioniChanged = Boolean(
        body.lokacioni_id && body.lokacioni_id !== batch.lokacioni_id,
      )
      const destLokacioniChanged = Boolean(
        batch.lloji === 'Transfer' &&
          body.destination_lokacioni_id &&
          body.destination_lokacioni_id !== batch.destination_lokacioni_id,
      )

      if (lokacioniChanged && body.lokacioni_id) {
        batchPatch.lokacioni_id = body.lokacioni_id
        batchPatch.shteti = lokacioniToCountry(lokacionet, body.lokacioni_id)
      }
      if (destLokacioniChanged && body.destination_lokacioni_id) {
        batchPatch.destination_lokacioni_id = body.destination_lokacioni_id
        batchPatch.destination_shteti = lokacioniToCountry(
          lokacionet,
          body.destination_lokacioni_id,
        )
      }

      routeChanged = lokacioniChanged || destLokacioniChanged

      if (Object.keys(batchPatch).length > 0) {
        batchPatch.updated_at = new Date().toISOString()
        await patchVeprimBatch(supabase, tenantId, batchId, batchPatch)
      }

      for (const row of rows) {
        const patch: Record<string, unknown> = {}
        if (dataChanged && row.data !== body.data) {
          patch.data = body.data
        }

        if (batch.lloji === 'Transfer' && routeChanged) {
          if (row.lloji === 'Dalje' && row.lokacioni_id !== nextLokacioniId) {
            if (nextLokacioniId) {
              patch.lokacioni_id = nextLokacioniId
              patch.shteti = lokacioniToCountry(lokacionet, nextLokacioniId)
            }
          } else if (
            row.lloji === 'Hyrje' &&
            row.lokacioni_id !== nextDestLokacioniId &&
            nextDestLokacioniId
          ) {
            patch.lokacioni_id = nextDestLokacioniId
            patch.shteti = lokacioniToCountry(lokacionet, nextDestLokacioniId)
          }
        } else if (
          lokacioniChanged &&
          batch.lloji !== 'Transfer' &&
          nextLokacioniId &&
          row.lokacioni_id !== nextLokacioniId
        ) {
          patch.lokacioni_id = nextLokacioniId
          patch.shteti = lokacioniToCountry(lokacionet, nextLokacioniId)
        }

        if (Object.keys(patch).length === 0) continue

        try {
          await patchVeprimi(supabase, tenantId, row.id, patch)
        } catch (rowError) {
          reply.code(400)
          return { error: rowError instanceof Error ? rowError.message : 'Update failed' }
        }
      }

      return ensured.migrated ? { ok: true, batch_id: batchId } : { ok: true }
    }

    const nextShteti = body.shteti ?? batch.shteti
    const nextDest =
      batch.lloji === 'Transfer'
        ? body.destination_shteti ?? batch.destination_shteti
        : batch.destination_shteti

    if (batch.lloji === 'Transfer') {
      if (!nextDest) {
        reply.code(400)
        return { error: ERR_TRANSFER_NEEDS_DESTINATION }
      }
      if (nextDest === nextShteti) {
        reply.code(400)
        return { error: ERR_TRANSFER_SAME_COUNTRY }
      }
    }

    const shtetiChanged = Boolean(body.shteti && body.shteti !== batch.shteti)
    const destinationChanged = Boolean(
      batch.lloji === 'Transfer' &&
        body.destination_shteti &&
        body.destination_shteti !== batch.destination_shteti,
    )

    if (shtetiChanged) batchPatch.shteti = body.shteti
    if (destinationChanged) batchPatch.destination_shteti = body.destination_shteti

    if (Object.keys(batchPatch).length > 0) {
      batchPatch.updated_at = new Date().toISOString()
      await patchVeprimBatch(supabase, tenantId, batchId, batchPatch)
    }

    routeChanged = shtetiChanged || destinationChanged

    for (const row of rows) {
      const patch: Record<string, unknown> = {}
      if (dataChanged && row.data !== body.data) {
        patch.data = body.data
      }

      if (batch.lloji === 'Transfer' && routeChanged) {
        if (row.lloji === 'Dalje' && row.shteti !== nextShteti) {
          patch.shteti = nextShteti
        } else if (row.lloji === 'Hyrje' && row.shteti !== nextDest) {
          patch.shteti = nextDest
        }
      } else if (shtetiChanged && batch.lloji !== 'Transfer' && row.shteti !== nextShteti) {
        patch.shteti = nextShteti
      }

      if (Object.keys(patch).length === 0) continue

      try {
        await patchVeprimi(supabase, tenantId, row.id, patch)
      } catch (rowError) {
        reply.code(400)
        return { error: rowError instanceof Error ? rowError.message : 'Update failed' }
      }
    }

    return ensured.migrated ? { ok: true, batch_id: batchId } : { ok: true }
  })

  app.patch('/api/action-batches/:id/items/:itemId', async (req, reply) => {
    const tenantId = req.user.id
    const params = z
      .object({ id: z.string().min(1), itemId: z.string().uuid() })
      .parse(req.params)
    const body = ActionItemPatchSchema.parse(req.body ?? {})

    if (
      !body.kodi_produktit &&
      body.cmimi_njesi === undefined &&
      body.sasia === undefined &&
      body.shenim === undefined
    ) {
      reply.code(400)
      return { error: ERR_NO_UPDATE_FIELDS }
    }

    const ensured = await ensureRealBatchId(supabase, tenantId, params.id)
    if ('error' in ensured) {
      reply.code(ensured.error.includes('nuk u gjet') ? 404 : 400)
      return { error: ensured.error }
    }
    const batchId = ensured.id

    const loaded = await loadBatchRows(supabase, tenantId, batchId)
    if ('error' in loaded) {
      reply.code(404)
      return { error: loaded.error }
    }

    const { batch, rows } = loaded
    const primary = rows.find((r) => r.id === params.itemId)
    if (!primary || !isDisplayRow(batch, primary)) {
      reply.code(404)
      return { error: ERR_PRODUCT_LINE_NOT_FOUND }
    }

    const nextKodi = body.kodi_produktit ?? primary.kodi_produktit
    const nextCmimi = body.cmimi_njesi ?? Number(primary.cmimi_njesi)
    const nextSasia = body.sasia ?? Number(primary.sasia)

    const displayRows = rows.filter((r) => isDisplayRow(batch, r))
    const duplicate = displayRows.some(
      (r) => r.id !== primary.id && r.kodi_produktit === nextKodi,
    )
    if (duplicate) {
      reply.code(400)
      return { error: ERR_DUPLICATE_PRODUCT_IN_ACTION }
    }

    const targets = [primary, ...findSiblingRows(batch, rows, primary)]
    for (const row of targets) {
      const patch: Record<string, unknown> = {
        cmimi_njesi: nextCmimi,
        sasia: nextSasia,
      }
      if (body.kodi_produktit) patch.kodi_produktit = nextKodi
      if (body.shenim !== undefined) patch.shenim = body.shenim

      try {
        await patchVeprimi(supabase, tenantId, row.id, patch)
      } catch (rowError) {
        reply.code(400)
        return { error: rowError instanceof Error ? rowError.message : 'Update failed' }
      }
    }

    await touchBatchUpdatedAt(supabase, tenantId, batchId)
    return ensured.migrated ? { ok: true, batch_id: batchId } : { ok: true }
  })

  const batchItemBodySchema = z.object({
    kodi_produktit: z.string().min(1),
    cmimi_njesi: z.number().nonnegative(),
    sasia: z.number().int().positive(),
    shenim: z
      .string()
      .max(200)
      .optional()
      .transform((value) => {
        const trimmed = value?.trim() ?? ''
        return trimmed || undefined
      }),
  })

  app.post('/api/action-batches/:id/items', async (req, reply) => {
    const tenantId = req.user.id
    const params = z.object({ id: z.string().min(1) }).parse(req.params)
    const body = batchItemBodySchema.parse(req.body ?? {})

    const ensured = await ensureRealBatchId(supabase, tenantId, params.id)
    if ('error' in ensured) {
      reply.code(ensured.error.includes('nuk u gjet') ? 404 : 400)
      return { error: ensured.error }
    }
    const batchId = ensured.id

    const loaded = await loadBatchRows(supabase, tenantId, batchId)
    if ('error' in loaded) {
      reply.code(404)
      return { error: loaded.error }
    }

    const { batch, rows } = loaded
    const displayRows = rows.filter((r) => isDisplayRow(batch, r))
    const duplicate = displayRows.some((r) => r.kodi_produktit === body.kodi_produktit)
    if (duplicate) {
      reply.code(400)
      return { error: ERR_DUPLICATE_PRODUCT_IN_ACTION }
    }

    if (batch.lloji === 'Dalje' || batch.lloji === 'Transfer') {
      try {
        await validateStock(supabase, tenantId, [body], { shteti: batch.shteti })
      } catch (e) {
        reply.code(e instanceof AppError ? e.statusCode : 400)
        return { error: e instanceof AppError ? e.message : 'Gabim gjate validimit.' }
      }
    }

    let insertRows: Record<string, unknown>[]
    try {
      insertRows = buildBatchItemInsertRows(batch, rows, body, tenantId)
    } catch (e) {
      reply.code(e instanceof AppError ? e.statusCode : 400)
      return { error: e instanceof AppError ? e.message : 'Gabim gjate krijimit.' }
    }

    let inserted: { id: string; lloji: string; shteti: Country }[]
    try {
      inserted = (await insertVeprimiRows(supabase, tenantId, insertRows)) as {
        id: string
        lloji: string
        shteti: Country
      }[]
    } catch (error) {
      reply.code(400)
      return { error: error instanceof Error ? error.message : 'Insert failed' }
    }

    const displayRow = displayRowFromInserted(batch, inserted)
    if (!displayRow) {
      reply.code(400)
      return { error: ERR_PRODUCT_LINE_NOT_FOUND }
    }

    await touchBatchUpdatedAt(supabase, tenantId, batchId)
    return ensured.migrated
      ? { ok: true, item_id: displayRow.id, batch_id: batchId }
      : { ok: true, item_id: displayRow.id }
  })

  app.delete('/api/action-batches/:id/items/:itemId', async (req, reply) => {
    const tenantId = req.user.id
    const params = z
      .object({ id: z.string().min(1), itemId: z.string().uuid() })
      .parse(req.params)

    const ensured = await ensureRealBatchId(supabase, tenantId, params.id)
    if ('error' in ensured) {
      reply.code(ensured.error.includes('nuk u gjet') ? 404 : 400)
      return { error: ensured.error }
    }
    const batchId = ensured.id

    const loaded = await loadBatchRows(supabase, tenantId, batchId)
    if ('error' in loaded) {
      reply.code(404)
      return { error: loaded.error }
    }

    const { batch, rows } = loaded
    const displayRows = rows.filter((r) => isDisplayRow(batch, r))
    if (displayRows.length <= 1) {
      reply.code(400)
      return { error: ERR_LAST_PRODUCT_LINE }
    }

    const primary = rows.find((r) => r.id === params.itemId)
    if (!primary || !isDisplayRow(batch, primary)) {
      reply.code(404)
      return { error: ERR_PRODUCT_LINE_NOT_FOUND }
    }

    const targets = [primary, ...findSiblingRows(batch, rows, primary)]
    const ids = targets.map((r) => r.id)
    try {
      await deleteVeprimiByIds(supabase, tenantId, ids)
    } catch (error) {
      reply.code(400)
      return { error: error instanceof Error ? error.message : 'Delete failed' }
    }

    await touchBatchUpdatedAt(supabase, tenantId, batchId)
    return ensured.migrated ? { ok: true, batch_id: batchId } : { ok: true }
  })

  app.delete('/api/action-batches/:id', async (req, reply) => {
    const tenantId = req.user.id
    const params = z.object({ id: z.string().min(1) }).parse(req.params)
    if (isLegacyBatchId(params.id)) {
      const result = await deleteLegacyBatch(supabase, tenantId, params.id)
      if ('error' in result && result.error) {
        reply.code(result.error.includes('nuk u gjet') ? 404 : 400)
        return { error: result.error }
      }
      return { ok: true }
    }

    try {
      await deleteVeprimBatchById(supabase, tenantId, params.id)
    } catch (error) {
      reply.code(400)
      return { error: error instanceof Error ? error.message : 'Delete failed' }
    }

    return { ok: true }
  })
}

export { createActionBatchRecord } from './services/actionsService.js'
