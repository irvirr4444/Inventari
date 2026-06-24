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
  normalizeDynamicActionBody,
  productLabel,
} from '@inventari/shared'
import { AppError } from '../errors.js'
import type { SessionUser } from '../domain/user.js'
import { findProduktetByKodi } from '../repositories/produktiRepository.js'
import { insertVeprimet } from '../repositories/veprimiRepository.js'
import { insertVeprimBatch } from '../repositories/veprimBatchRepository.js'
import { listLokacionetByOwner } from '../repositories/lokacioniRepository.js'
import { resolveLokacioniIdForCountry } from './legacyDtoService.js'
import { lokacioniToCountry } from '../domain/lokacioni.js'
import { getTrackPriceForTenant } from './tenantConfigService.js'

export function validateTransfer(body: NormalizedActionBody) {
  if (body.lloji !== 'Transfer') return
  if (body.lokacioni_id) {
    if (!body.destination_lokacioni_id) {
      throw new AppError(400, ERR_TRANSFER_NEEDS_DESTINATION)
    }
    if (body.destination_lokacioni_id === body.lokacioni_id) {
      throw new AppError(400, ERR_TRANSFER_SAME_COUNTRY)
    }
    return
  }
  if (!body.destination_shteti) {
    throw new AppError(400, ERR_TRANSFER_NEEDS_DESTINATION)
  }
  if (body.destination_shteti === body.shteti) {
    throw new AppError(400, ERR_TRANSFER_SAME_COUNTRY)
  }
}

export async function validateStock(
  supabase: SupabaseClient,
  tenantId: string,
  items: ActionItemInput[],
  opts: { shteti?: Country; lokacioni_id?: string },
) {
  const qtyByCode = new Map<string, number>()
  for (const it of items) {
    qtyByCode.set(it.kodi_produktit, (qtyByCode.get(it.kodi_produktit) ?? 0) + it.sasia)
  }
  const aggregated = [...qtyByCode.entries()].map(([kodi_produktit, sasia]) => ({
    kodi_produktit,
    sasia,
    cmimi_njesi: 0,
  }))

  const codes = [...qtyByCode.keys()]
  const products = await findProduktetByKodi(supabase, tenantId, codes)
  const byCode = new Map(products.map((p) => [p.kodi, p]))

  if (opts.lokacioni_id) {
    const { listGjendjeForProducts } = await import('../repositories/produktiRepository.js')
    const stockRows = await listGjendjeForProducts(
      supabase,
      tenantId,
      products.map((p) => p.id),
    )
    const stockByProduct = new Map<string, number>()
    for (const row of stockRows) {
      if (row.lokacioni_id === opts.lokacioni_id) {
        stockByProduct.set(row.produkti_id, Number(row.sasia))
      }
    }
    for (const it of aggregated) {
      const p = byCode.get(it.kodi_produktit)
      if (!p) throw new AppError(400, `Produkti ${it.kodi_produktit} nuk u gjet.`)
      const current = stockByProduct.get(p.id) ?? 0
      if (it.sasia > current) {
        throw new AppError(400, errInsufficientStock(productLabel(p.emri, it.kodi_produktit)))
      }
    }
    return
  }

  const shteti = opts.shteti!
  for (const it of aggregated) {
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
  lokacioni_id?: string | null
  kodi_produktit: string
  cmimi_njesi: number
  sasia: number
  shenim?: string | null
}

function itemShenim(it: ActionItemInput): string | null {
  return it.shenim?.trim() ? it.shenim.trim() : null
}

export function buildVeprimRows(
  body: NormalizedActionBody,
  opts: { mirrorToAlbania: boolean; lokacionet: Array<{ id: string; kodi: string }> },
): {
  rows: VeprimInsertRow[]
  mirrorRows: VeprimInsertRow[]
} {
  if (body.lokacioni_id) {
    const locById = new Map(opts.lokacionet.map((l) => [l.id, l.kodi]))
    const toCountry = (id: string | undefined): Country => {
      const kodi = id ? locById.get(id) : undefined
      return kodi === 'AL' ? 'AL' : 'XK'
    }

    const rows: VeprimInsertRow[] =
      body.lloji === 'Transfer' && body.destination_lokacioni_id
        ? body.items.flatMap((it) => [
            {
              lloji: 'Dalje' as const,
              data: body.data ?? undefined,
              shteti: toCountry(body.lokacioni_id),
              lokacioni_id: body.lokacioni_id,
              kodi_produktit: it.kodi_produktit,
              cmimi_njesi: it.cmimi_njesi,
              sasia: it.sasia,
              shenim: itemShenim(it),
            },
            {
              lloji: 'Hyrje' as const,
              data: body.data ?? undefined,
              shteti: toCountry(body.destination_lokacioni_id),
              lokacioni_id: body.destination_lokacioni_id,
              kodi_produktit: it.kodi_produktit,
              cmimi_njesi: it.cmimi_njesi,
              sasia: it.sasia,
              shenim: itemShenim(it),
            },
          ])
        : body.items.map((it) => ({
            lloji: body.lloji as 'Hyrje' | 'Dalje',
            data: body.data ?? undefined,
            shteti: toCountry(body.lokacioni_id),
            lokacioni_id: body.lokacioni_id,
            kodi_produktit: it.kodi_produktit,
            cmimi_njesi: it.cmimi_njesi,
            sasia: it.sasia,
            shenim: itemShenim(it),
          }))
    return { rows, mirrorRows: [] }
  }

  const resolveLoc = (country: Country) =>
    resolveLokacioniIdForCountry(
      opts.lokacionet.map((l) => ({
        id: l.id,
        pronari_id: '',
        emri: '',
        kodi: l.kodi,
        flag_emoji: null,
        rradhitja: 0,
        show_in_summary: true,
        aktiv: true,
      })),
      country,
    )

  const rows: VeprimInsertRow[] =
    body.lloji === 'Transfer' && body.destination_shteti
      ? body.items.flatMap((it) => [
          {
            lloji: 'Dalje' as const,
            data: body.data ?? undefined,
            shteti: body.shteti!,
            lokacioni_id: resolveLoc(body.shteti!),
            kodi_produktit: it.kodi_produktit,
            cmimi_njesi: it.cmimi_njesi,
            sasia: it.sasia,
            shenim: itemShenim(it),
          },
          {
            lloji: 'Hyrje' as const,
            data: body.data ?? undefined,
            shteti: body.destination_shteti!,
            lokacioni_id: resolveLoc(body.destination_shteti!),
            kodi_produktit: it.kodi_produktit,
            cmimi_njesi: it.cmimi_njesi,
            sasia: it.sasia,
            shenim: itemShenim(it),
          },
        ])
      : body.items.map((it) => ({
          lloji: body.lloji as 'Hyrje' | 'Dalje',
          data: body.data ?? undefined,
          shteti: body.shteti!,
          lokacioni_id: resolveLoc(body.shteti!),
          kodi_produktit: it.kodi_produktit,
          cmimi_njesi: it.cmimi_njesi,
          sasia: it.sasia,
          shenim: itemShenim(it),
        }))

  const mirrorRows: VeprimInsertRow[] =
    opts.mirrorToAlbania && body.shteti === 'XK' && body.lloji === 'Dalje'
      ? body.items.map((it) => ({
          lloji: 'Hyrje' as const,
          data: body.data ?? undefined,
          shteti: 'AL' as const,
          lokacioni_id: resolveLoc('AL'),
          kodi_produktit: it.kodi_produktit,
          cmimi_njesi: it.cmimi_njesi,
          sasia: it.sasia,
          shenim: itemShenim(it),
        }))
      : []

  return { rows, mirrorRows }
}

export async function createAction(
  supabase: SupabaseClient,
  user: SessionUser,
  parsedBody: Parameters<typeof normalizeActionBody>[0] | Parameters<typeof normalizeDynamicActionBody>[0],
  opts?: { dynamic?: boolean },
) {
  const body = opts?.dynamic
    ? normalizeDynamicActionBody(parsedBody as Parameters<typeof normalizeDynamicActionBody>[0])
    : normalizeActionBody(parsedBody as Parameters<typeof normalizeActionBody>[0])

  if (opts?.dynamic) {
    const trackPrice = await getTrackPriceForTenant(supabase, user.id)
    if (!trackPrice) {
      for (const item of body.items) {
        item.cmimi_njesi = 0
      }
    }
  }

  validateTransfer(body)

  if (body.lloji === 'Dalje' || body.lloji === 'Transfer') {
    await validateStock(supabase, user.id, body.items, {
      shteti: body.shteti,
      lokacioni_id: body.lokacioni_id,
    })
  }

  const lokacionet = await listLokacionetByOwner(supabase, user.id)
  const { rows, mirrorRows } = buildVeprimRows(body, {
    mirrorToAlbania: user.isLegacy,
    lokacionet,
  })

  const sourceLoc = body.lokacioni_id ?? resolveLokacioniIdForCountry(lokacionet, body.shteti!)
  const destLoc =
    body.destination_lokacioni_id ??
    (body.destination_shteti != null
      ? resolveLokacioniIdForCountry(lokacionet, body.destination_shteti)
      : null)

  const batchShteti = body.shteti ?? lokacioniToCountry(lokacionet, sourceLoc)
  const batchDestShteti =
    body.lloji === 'Transfer'
      ? body.destination_shteti ?? (destLoc ? lokacioniToCountry(lokacionet, destLoc) : null)
      : body.destination_shteti ?? null

  let batchId: string | null = null
  try {
    batchId = await insertVeprimBatch(supabase, user.id, {
      lloji: body.lloji,
      data: body.data,
      shteti: batchShteti,
      destination_shteti: batchDestShteti,
      lokacioni_id: sourceLoc,
      destination_lokacioni_id: destLoc,
      ora: body.ora ?? null,
      pershkrimi: body.pershkrimi ?? null,
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

  const data = await insertVeprimet(supabase, user.id, insertRows)

  return {
    data,
    meta: {
      batch_id: batchId,
      transfer: body.lloji === 'Transfer',
      transfer_count: body.lloji === 'Transfer' ? body.items.length : 0,
      transfer_from: body.lloji === 'Transfer' ? batchShteti : undefined,
      transfer_to: body.lloji === 'Transfer' ? batchDestShteti ?? undefined : undefined,
      mirrored_to_albania: mirrorRows.length > 0,
      mirrored_count: mirrorRows.length,
    },
  }
}

export async function listActions(
  supabase: SupabaseClient,
  user: SessionUser,
  query: {
    shteti?: Country
    from?: string
    to?: string
    lloji?: 'Hyrje' | 'Dalje'
    kodi?: string
    limit?: number
  },
) {
  const { listVeprimet } = await import('../repositories/veprimiRepository.js')
  return listVeprimet(supabase, user.id, query)
}

export type { NormalizedActionBody, BatchLloji }

export async function createActionBatchRecord(
  supabase: SupabaseClient,
  tenantId: string,
  input: {
    lloji: BatchLloji
    data?: string
    shteti: Country
    destination_shteti?: Country
    ora?: string
    pershkrimi?: string
  },
) {
  const lokacionet = await listLokacionetByOwner(supabase, tenantId)
  const sourceLoc = resolveLokacioniIdForCountry(lokacionet, input.shteti)
  const destLoc =
    input.destination_shteti != null
      ? resolveLokacioniIdForCountry(lokacionet, input.destination_shteti)
      : null

  return insertVeprimBatch(supabase, tenantId, {
    lloji: input.lloji,
    data: input.data,
    shteti: input.shteti,
    destination_shteti: input.destination_shteti,
    lokacioni_id: sourceLoc,
    destination_lokacioni_id: destLoc,
    ora: input.ora ?? null,
    pershkrimi: input.pershkrimi ?? null,
  })
}
