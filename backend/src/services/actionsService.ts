import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type ActionItemInput,
  type BatchLloji,
  type Country,
  type NormalizedActionBody,
  ERR_BATCH_CREATE_FAILED,
  ERR_TRANSFER_NEEDS_DESTINATION,
  ERR_TRANSFER_SAME_COUNTRY,
  errInsufficientStock,
  normalizeActionBody,
  productLabel,
} from '@inventari/shared'
import { AppError } from '../errors.js'
import { createActionBatchRecord } from '../actionBatches.js'

export function validateTransfer(body: NormalizedActionBody) {
  if (body.lloji !== 'Transfer') return
  if (!body.destination_shteti) {
    throw new AppError(400, ERR_TRANSFER_NEEDS_DESTINATION)
  }
  if (body.destination_shteti === body.shteti) {
    throw new AppError(400, ERR_TRANSFER_SAME_COUNTRY)
  }
}

export async function validateStock(
  supabase: SupabaseClient,
  items: ActionItemInput[],
  shteti: Country,
) {
  const codes = [...new Set(items.map((it) => it.kodi_produktit))]
  const { data: products, error } = await supabase
    .from('produkti')
    .select('kodi,emri,gjendje_kosove,gjendje_shqiperi')
    .in('kodi', codes)

  if (error) throw new AppError(400, error.message)

  const byCode = new Map((products ?? []).map((p) => [p.kodi, p]))

  for (const it of items) {
    const p = byCode.get(it.kodi_produktit)
    if (!p) {
      throw new AppError(400, `Produkti ${it.kodi_produktit} nuk u gjet.`)
    }
    const current =
      shteti === 'XK' ? Number(p.gjendje_kosove ?? 0) : Number(p.gjendje_shqiperi ?? 0)
    if (it.sasia > current) {
      throw new AppError(400, errInsufficientStock(productLabel(p.emri, it.kodi_produktit)))
    }
  }
}

type VeprimInsertRow = {
  lloji: 'Hyrje' | 'Dalje'
  data?: string
  shteti: Country
  kodi_produktit: string
  cmimi_njesi: number
  sasia: number
}

export function buildVeprimRows(body: NormalizedActionBody): {
  rows: VeprimInsertRow[]
  mirrorRows: VeprimInsertRow[]
} {
  const rows: VeprimInsertRow[] =
    body.lloji === 'Transfer' && body.destination_shteti
      ? body.items.flatMap((it) => [
          {
            lloji: 'Dalje' as const,
            data: body.data ?? undefined,
            shteti: body.shteti,
            kodi_produktit: it.kodi_produktit,
            cmimi_njesi: it.cmimi_njesi,
            sasia: it.sasia,
          },
          {
            lloji: 'Hyrje' as const,
            data: body.data ?? undefined,
            shteti: body.destination_shteti!,
            kodi_produktit: it.kodi_produktit,
            cmimi_njesi: it.cmimi_njesi,
            sasia: it.sasia,
          },
        ])
      : body.items.map((it) => ({
          lloji: body.lloji as 'Hyrje' | 'Dalje',
          data: body.data ?? undefined,
          shteti: body.shteti,
          kodi_produktit: it.kodi_produktit,
          cmimi_njesi: it.cmimi_njesi,
          sasia: it.sasia,
        }))

  const mirrorRows: VeprimInsertRow[] =
    body.shteti === 'XK' && body.lloji === 'Dalje'
      ? body.items.map((it) => ({
          lloji: 'Hyrje' as const,
          data: body.data ?? undefined,
          shteti: 'AL' as const,
          kodi_produktit: it.kodi_produktit,
          cmimi_njesi: it.cmimi_njesi,
          sasia: it.sasia,
        }))
      : []

  return { rows, mirrorRows }
}

export async function createAction(
  supabase: SupabaseClient,
  parsedBody: Parameters<typeof normalizeActionBody>[0],
) {
  const body = normalizeActionBody(parsedBody)

  validateTransfer(body)

  if (body.lloji === 'Dalje' || body.lloji === 'Transfer') {
    await validateStock(supabase, body.items, body.shteti)
  }

  const { rows, mirrorRows } = buildVeprimRows(body)

  let batchId: string | null = null
  try {
    batchId = await createActionBatchRecord(supabase, {
      lloji: body.lloji,
      data: body.data,
      shteti: body.shteti,
      destination_shteti: body.destination_shteti,
    })
  } catch (batchErr) {
    throw new AppError(
      400,
      batchErr instanceof Error ? batchErr.message : ERR_BATCH_CREATE_FAILED,
    )
  }

  const insertRows = [...rows, ...mirrorRows].map((row) => ({
    ...row,
    batch_id: batchId,
  }))

  const { data, error } = await supabase.from('veprimi').insert(insertRows).select('*')

  if (error) throw new AppError(400, error.message)

  return {
    data,
    meta: {
      batch_id: batchId,
      transfer: body.lloji === 'Transfer',
      transfer_count: body.lloji === 'Transfer' ? body.items.length : 0,
      transfer_from: body.lloji === 'Transfer' ? body.shteti : undefined,
      transfer_to: body.lloji === 'Transfer' ? body.destination_shteti : undefined,
      mirrored_to_albania: mirrorRows.length > 0,
      mirrored_count: mirrorRows.length,
    },
  }
}

export async function listActions(
  supabase: SupabaseClient,
  query: {
    shteti?: Country
    from?: string
    to?: string
    lloji?: 'Hyrje' | 'Dalje'
    kodi?: string
    limit?: number
  },
) {
  let q = supabase
    .from('veprimi')
    .select('*')
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  if (query.shteti) q = q.eq('shteti', query.shteti)
  if (query.lloji) q = q.eq('lloji', query.lloji)
  if (query.kodi) q = q.eq('kodi_produktit', query.kodi)
  if (query.from) q = q.gte('data', query.from)
  if (query.to) q = q.lte('data', query.to)
  if (query.limit) q = q.limit(query.limit)

  const { data, error } = await q
  if (error) throw new AppError(500, error.message)
  return data ?? []
}

export type { NormalizedActionBody, BatchLloji }
