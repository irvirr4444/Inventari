import type { SupabaseClient } from '@supabase/supabase-js'
import type { FastifyInstance } from 'fastify'
import {
  BatchLlojiSchema,
  CountrySchema,
  ActionBatchPatchSchema,
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
import { validateStock } from './services/actionsService.js'
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
  kodi_produktit: string
  cmimi_njesi: number | string
  sasia: number
  totali: number | string
  created_at: string
}

async function loadBatchRows(supabase: SupabaseClient, batchId: string) {
  const { data: batch, error: batchError } = await supabase
    .from('veprim_batch')
    .select('*')
    .eq('id', batchId)
    .single()

  if (batchError || !batch) return { error: ERR_BATCH_NOT_FOUND }

  const { data: rows, error: rowsError } = await supabase
    .from('veprimi')
    .select('*')
    .eq('batch_id', batchId)
    .order('kodi_produktit', { ascending: true })

  if (rowsError) return { error: rowsError.message }

  return {
    batch: batch as VeprimBatchRow,
    rows: (rows ?? []) as VeprimRow[],
  }
}

function aggregateBatch(batch: VeprimBatchRow, rows: VeprimRow[]) {
  const displayRows = rows.filter((r) => isDisplayRow(batch, r))
  const totali = displayRows.reduce((sum, r) => sum + Number(r.totali ?? 0), 0)
  return {
    id: batch.id,
    lloji: batch.lloji,
    shteti: batch.shteti,
    destination_shteti: batch.destination_shteti ?? undefined,
    data: batch.data,
    ora: batch.ora ? formatOraDisplay(batch.ora) : null,
    pershkrimi: batch.pershkrimi ?? null,
    totali,
    created_at: batch.created_at,
    item_count: displayRows.length,
  }
}

type BatchItemInput = {
  kodi_produktit: string
  cmimi_njesi: number
  sasia: number
}

function buildBatchItemInsertRows(
  batch: VeprimBatchRow,
  rows: VeprimRow[],
  item: BatchItemInput,
): Record<string, unknown>[] {
  const base = {
    batch_id: batch.id,
    data: batch.data,
    kodi_produktit: item.kodi_produktit,
    cmimi_njesi: item.cmimi_njesi,
    sasia: item.sasia,
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

async function touchBatchUpdatedAt(supabase: SupabaseClient, batchId: string) {
  await supabase
    .from('veprim_batch')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', batchId)
}

export function registerActionBatchRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get('/api/action-batches', async (req) => {
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

    let q = supabase
      .from('veprim_batch')
      .select('*')
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })

    if (query.lloji) q = q.eq('lloji', query.lloji)
    if (query.shteti) q = q.eq('shteti', query.shteti)
    if (query.dateFrom) q = q.gte('data', query.dateFrom)
    if (query.dateTo) q = q.lte('data', query.dateTo)

    const { data: batches, error } = await q

    let batchedActions: ReturnType<typeof aggregateBatch>[] = []
    if (!error) {
      const batchList = (batches ?? []) as VeprimBatchRow[]
      const batchIds = batchList.map((b) => b.id)

      const rowsByBatch = new Map<string, VeprimRow[]>()
      if (batchIds.length > 0) {
        const { data: allRows, error: rowsError } = await supabase
          .from('veprimi')
          .select('*')
          .in('batch_id', batchIds)

        if (rowsError) throw rowsError

        for (const row of (allRows ?? []) as VeprimRow[]) {
          if (!row.batch_id) continue
          const list = rowsByBatch.get(row.batch_id) ?? []
          list.push(row)
          rowsByBatch.set(row.batch_id, list)
        }
      }

      batchedActions = batchList.map((batch) =>
        aggregateBatch(batch, rowsByBatch.get(batch.id) ?? []),
      )
    } else if (!error.message.includes('veprim_batch') && error.code !== '42P01') {
      throw error
    }

    const legacyActions = await fetchLegacyActionBatches(supabase, {
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
    const params = z.object({ id: z.string().min(1) }).parse(req.params)

    if (isLegacyBatchId(params.id)) {
      const legacy = await loadLegacyBatchDetail(supabase, params.id)
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

    const loaded = await loadBatchRows(supabase, params.id)
    if ('error' in loaded) {
      reply.code(404)
      return { error: loaded.error }
    }

    const { batch, rows } = loaded
    const displayRows = rows.filter((r) => isDisplayRow(batch, r))
    const productCodes = [...new Set(displayRows.map((r) => r.kodi_produktit))]

    const { data: products, error: productsError } = await supabase
      .from('produkti')
      .select('kodi,emri')
      .in('kodi', productCodes)

    if (productsError) throw productsError

    const namesByCode = new Map((products ?? []).map((p) => [p.kodi, p.emri]))

    const items = displayRows.map((row) => ({
      id: row.id,
      kodi_produktit: row.kodi_produktit,
      emri_produktit: namesByCode.get(row.kodi_produktit) ?? row.kodi_produktit,
      cmimi_njesi: Number(row.cmimi_njesi),
      sasia: Number(row.sasia),
      totali: Number(row.totali),
    }))

    const base = aggregateBatch(batch, rows)
    return {
      ...base,
      items,
      mirrored_to_albania: isMirroredBatch(batch, rows),
    }
  })

  app.patch('/api/action-batches/:id', async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params)
    const body = ActionBatchPatchSchema.parse(req.body ?? {})

    const ensured = await ensureRealBatchId(supabase, params.id, {
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

    const loaded = await loadBatchRows(supabase, batchId)
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

    const batchPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.data) batchPatch.data = body.data
    if (body.shteti) batchPatch.shteti = body.shteti
    if (batch.lloji === 'Transfer' && body.destination_shteti) {
      batchPatch.destination_shteti = body.destination_shteti
    }
    if (body.ora !== undefined) batchPatch.ora = body.ora
    if (body.pershkrimi !== undefined) batchPatch.pershkrimi = body.pershkrimi ?? null

    const { error: batchError } = await supabase
      .from('veprim_batch')
      .update(batchPatch)
      .eq('id', batchId)

    if (batchError) {
      reply.code(400)
      return { error: batchError.message }
    }

    for (const row of rows) {
      const patch: Record<string, unknown> = {}
      if (body.data) patch.data = body.data

      if (batch.lloji === 'Transfer' && (body.shteti || body.destination_shteti)) {
        if (row.lloji === 'Dalje') {
          patch.shteti = nextShteti
        } else if (row.lloji === 'Hyrje') {
          patch.shteti = nextDest
        }
      } else if (body.shteti && batch.lloji !== 'Transfer') {
        patch.shteti = nextShteti
      }

      if (Object.keys(patch).length === 0) continue

      const { error: rowError } = await supabase.from('veprimi').update(patch).eq('id', row.id)
      if (rowError) {
        reply.code(400)
        return { error: rowError.message }
      }
    }

    return ensured.migrated ? { ok: true, batch_id: batchId } : { ok: true }
  })

  app.patch('/api/action-batches/:id/items/:itemId', async (req, reply) => {
    const params = z
      .object({ id: z.string().min(1), itemId: z.string().uuid() })
      .parse(req.params)
    const body = z
      .object({
        kodi_produktit: z.string().min(1).optional(),
        cmimi_njesi: z.number().nonnegative().optional(),
        sasia: z.number().int().positive().optional(),
      })
      .parse(req.body ?? {})

    if (!body.kodi_produktit && body.cmimi_njesi === undefined && body.sasia === undefined) {
      reply.code(400)
      return { error: ERR_NO_UPDATE_FIELDS }
    }

    const ensured = await ensureRealBatchId(supabase, params.id)
    if ('error' in ensured) {
      reply.code(ensured.error.includes('nuk u gjet') ? 404 : 400)
      return { error: ensured.error }
    }
    const batchId = ensured.id

    const loaded = await loadBatchRows(supabase, batchId)
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

      const { error: rowError } = await supabase.from('veprimi').update(patch).eq('id', row.id)
      if (rowError) {
        reply.code(400)
        return { error: rowError.message }
      }
    }

    await touchBatchUpdatedAt(supabase, batchId)
    return ensured.migrated ? { ok: true, batch_id: batchId } : { ok: true }
  })

  const batchItemBodySchema = z.object({
    kodi_produktit: z.string().min(1),
    cmimi_njesi: z.number().nonnegative(),
    sasia: z.number().int().positive(),
  })

  app.post('/api/action-batches/:id/items', async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params)
    const body = batchItemBodySchema.parse(req.body ?? {})

    const ensured = await ensureRealBatchId(supabase, params.id)
    if ('error' in ensured) {
      reply.code(ensured.error.includes('nuk u gjet') ? 404 : 400)
      return { error: ensured.error }
    }
    const batchId = ensured.id

    const loaded = await loadBatchRows(supabase, batchId)
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
        await validateStock(supabase, [body], batch.shteti)
      } catch (e) {
        reply.code(e instanceof AppError ? e.statusCode : 400)
        return { error: e instanceof AppError ? e.message : 'Gabim gjate validimit.' }
      }
    }

    let insertRows: Record<string, unknown>[]
    try {
      insertRows = buildBatchItemInsertRows(batch, rows, body)
    } catch (e) {
      reply.code(e instanceof AppError ? e.statusCode : 400)
      return { error: e instanceof AppError ? e.message : 'Gabim gjate krijimit.' }
    }

    const { data, error } = await supabase.from('veprimi').insert(insertRows).select('id, lloji, shteti')
    if (error) {
      reply.code(400)
      return { error: error.message }
    }

    const displayRow = displayRowFromInserted(batch, (data ?? []) as { id: string; lloji: string; shteti: Country }[])
    if (!displayRow) {
      reply.code(400)
      return { error: ERR_PRODUCT_LINE_NOT_FOUND }
    }

    await touchBatchUpdatedAt(supabase, batchId)
    return ensured.migrated
      ? { ok: true, item_id: displayRow.id, batch_id: batchId }
      : { ok: true, item_id: displayRow.id }
  })

  app.delete('/api/action-batches/:id/items/:itemId', async (req, reply) => {
    const params = z
      .object({ id: z.string().min(1), itemId: z.string().uuid() })
      .parse(req.params)

    const ensured = await ensureRealBatchId(supabase, params.id)
    if ('error' in ensured) {
      reply.code(ensured.error.includes('nuk u gjet') ? 404 : 400)
      return { error: ensured.error }
    }
    const batchId = ensured.id

    const loaded = await loadBatchRows(supabase, batchId)
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
    const { error } = await supabase.from('veprimi').delete().in('id', ids)
    if (error) {
      reply.code(400)
      return { error: error.message }
    }

    await touchBatchUpdatedAt(supabase, batchId)
    return ensured.migrated ? { ok: true, batch_id: batchId } : { ok: true }
  })

  app.delete('/api/action-batches/:id', async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params)
    if (isLegacyBatchId(params.id)) {
      const result = await deleteLegacyBatch(supabase, params.id)
      if ('error' in result && result.error) {
        reply.code(result.error.includes('nuk u gjet') ? 404 : 400)
        return { error: result.error }
      }
      return { ok: true }
    }

    const { error } = await supabase.from('veprim_batch').delete().eq('id', params.id)
    if (error) {
      reply.code(400)
      return { error: error.message }
    }

    return { ok: true }
  })
}

export async function createActionBatchRecord(
  supabase: SupabaseClient,
  input: {
    lloji: BatchLloji
    data?: string
    shteti: Country
    destination_shteti?: Country
    ora?: string
    pershkrimi?: string
  },
) {
  const { data, error } = await supabase
    .from('veprim_batch')
    .insert({
      lloji: input.lloji,
      data: input.data ?? new Date().toISOString().slice(0, 10),
      shteti: input.shteti,
      destination_shteti: input.destination_shteti ?? null,
      ora: input.ora ?? null,
      pershkrimi: input.pershkrimi ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}
