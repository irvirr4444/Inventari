import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ProductCreateSchema,
  ProductIdParamsSchema,
  ProductUpdateSchema,
} from '@inventari/shared'
import type { SessionUser } from '../domain/user.js'
import { AppError } from '../errors.js'
import {
  deleteProdukti,
  findProduktiById,
  insertProdukti,
  listGjendjeForProducts,
  listProduktet,
  updateProdukti,
  upsertGjendjeRows,
  type ProduktiRow,
} from '../repositories/produktiRepository.js'
import { listLokacionetByOwner } from '../repositories/lokacioniRepository.js'
import {
  countryToLegacyLokacioniId,
  mapProductResponse,
  type DynamicStockEntry,
} from './legacyDtoService.js'

async function buildStockMap(
  supabase: SupabaseClient,
  tenantId: string,
  productIds: string[],
): Promise<Map<string, DynamicStockEntry[]>> {
  const rows = await listGjendjeForProducts(supabase, tenantId, productIds)
  const map = new Map<string, DynamicStockEntry[]>()
  for (const row of rows) {
    const list = map.get(row.produkti_id) ?? []
    list.push({ lokacioni_id: row.lokacioni_id, sasia: Number(row.sasia) })
    map.set(row.produkti_id, list)
  }
  return map
}

export async function listProducts(
  supabase: SupabaseClient,
  user: SessionUser,
  query: { search?: string },
) {
  const rows = await listProduktet(supabase, user.id, query)
  if (user.isLegacy) {
    return rows.map((row) => mapProductResponse(user, row, []))
  }

  const stockMap = await buildStockMap(
    supabase,
    user.id,
    rows.map((r) => r.id),
  )
  return rows.map((row) => mapProductResponse(user, row, stockMap.get(row.id) ?? []))
}

export async function createProduct(
  supabase: SupabaseClient,
  user: SessionUser,
  body: unknown,
) {
  const parsed = ProductCreateSchema.parse(body)
  const row = await insertProdukti(supabase, user.id, parsed)

  if (!user.isLegacy) {
    const lokacionet = await listLokacionetByOwner(supabase, user.id)
    const stockRows: DynamicStockEntry[] = []
    for (const loc of lokacionet) {
      let sasia = 0
      if (loc.kodi === 'XK') sasia = parsed.gjendje_kosove ?? 0
      if (loc.kodi === 'AL') sasia = parsed.gjendje_shqiperi ?? 0
      stockRows.push({ lokacioni_id: loc.id, sasia })
    }
    if (stockRows.length > 0) {
      await upsertGjendjeRows(
        supabase,
        user.id,
        stockRows.map((s) => ({ produkti_id: row.id, ...s })),
      )
    }
    return mapProductResponse(user, row, stockRows)
  }

  await upsertGjendjeRows(supabase, user.id, [
    {
      produkti_id: row.id,
      lokacioni_id: countryToLegacyLokacioniId('XK'),
      sasia: parsed.gjendje_kosove ?? 0,
    },
    {
      produkti_id: row.id,
      lokacioni_id: countryToLegacyLokacioniId('AL'),
      sasia: parsed.gjendje_shqiperi ?? 0,
    },
  ])

  return mapProductResponse(user, row, [])
}

export async function updateProduct(
  supabase: SupabaseClient,
  user: SessionUser,
  id: string,
  body: unknown,
) {
  ProductIdParamsSchema.parse({ id })
  const parsed = ProductUpdateSchema.parse(body)
  const { stock, kodi, emri, gjendje_kosove, gjendje_shqiperi } = parsed

  const produktiPatch: Partial<
    Pick<ProduktiRow, 'kodi' | 'emri' | 'gjendje_kosove' | 'gjendje_shqiperi'>
  > = {}
  if (kodi !== undefined) produktiPatch.kodi = kodi
  if (emri !== undefined) produktiPatch.emri = emri
  if (gjendje_kosove !== undefined) produktiPatch.gjendje_kosove = gjendje_kosove
  if (gjendje_shqiperi !== undefined) produktiPatch.gjendje_shqiperi = gjendje_shqiperi

  let row: ProduktiRow
  if (Object.keys(produktiPatch).length > 0) {
    row = await updateProdukti(supabase, user.id, id, produktiPatch)
  } else {
    const existing = await findProduktiById(supabase, user.id, id)
    if (!existing) throw new AppError(404, 'Product not found')
    row = existing
  }

  if (
    parsed.gjendje_kosove !== undefined ||
    parsed.gjendje_shqiperi !== undefined
  ) {
    await upsertGjendjeRows(supabase, user.id, [
      {
        produkti_id: row.id,
        lokacioni_id: countryToLegacyLokacioniId('XK'),
        sasia: parsed.gjendje_kosove ?? row.gjendje_kosove,
      },
      {
        produkti_id: row.id,
        lokacioni_id: countryToLegacyLokacioniId('AL'),
        sasia: parsed.gjendje_shqiperi ?? row.gjendje_shqiperi,
      },
    ])
  }

  if (!user.isLegacy && stock) {
    await upsertGjendjeRows(
      supabase,
      user.id,
      stock.map((s) => ({
        produkti_id: row.id,
        lokacioni_id: s.lokacioni_id,
        sasia: s.sasia,
      })),
    )
  }

  if (user.isLegacy) {
    return mapProductResponse(user, row, [])
  }

  const stockMap = await buildStockMap(supabase, user.id, [row.id])
  return mapProductResponse(user, row, stockMap.get(row.id) ?? [])
}

export async function deleteProduct(
  supabase: SupabaseClient,
  user: SessionUser,
  id: string,
) {
  ProductIdParamsSchema.parse({ id })
  await deleteProdukti(supabase, user.id, id)
  return { ok: true as const }
}
