import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ProductCreateSchema,
  ProductIdParamsSchema,
  ProductUpdateSchema,
} from '@inventari/shared'
import type { SessionUser } from '../../domain/user.js'
import { AppError } from '../../errors.js'
import {
  deleteProdukti,
  findProduktiById,
  insertProdukti,
  listGjendjeForProducts,
  listProduktet,
  updateProdukti,
  upsertGjendjeRows,
  type ProduktiRow,
} from '../../repositories/produktiRepository.js'
import { listLokacionetByOwner } from '../../repositories/lokacioniRepository.js'
import {
  countryToLegacyLokacioniId,
  mapProductResponse,
  type DynamicStockEntry,
} from '../actions/index.js'
import {
  hasMinimumAccess,
  highestAccessInAnyLocation,
  isAdmin,
  requireLocationAccess,
  tenantIdFor,
} from '../access/index.js'

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

function assertCanListProducts(user: SessionUser): void {
  if (isAdmin(user)) return
  if (!highestAccessInAnyLocation(user, 'view')) {
    throw new AppError(403, 'No location access')
  }
}

function assertCanCreateProduct(user: SessionUser): void {
  if (isAdmin(user)) return
  if (!highestAccessInAnyLocation(user, 'add')) {
    throw new AppError(403, 'Insufficient permission to add products')
  }
}

async function assertCanDeleteProduct(
  supabase: SupabaseClient,
  user: SessionUser,
  productId: string,
): Promise<void> {
  if (isAdmin(user)) return

  const tenantId = tenantIdFor(user)
  const stockMap = await buildStockMap(supabase, tenantId, [productId])
  const stock = stockMap.get(productId) ?? []
  const affectedLocationIds = stock
    .filter((row) => row.sasia > 0)
    .map((row) => row.lokacioni_id)

  const requiredLocations =
    affectedLocationIds.length > 0
      ? affectedLocationIds
      : (await listLokacionetByOwner(supabase, tenantId)).map((l) => l.id)

  for (const lokacioniId of requiredLocations) {
    if (!hasMinimumAccess(user, lokacioniId, 'edit_delete')) {
      throw new AppError(403, 'Insufficient permission to delete this product')
    }
  }
}

export async function listProducts(
  supabase: SupabaseClient,
  user: SessionUser,
  query: { search?: string },
) {
  assertCanListProducts(user)
  const tenantId = tenantIdFor(user)
  const rows = await listProduktet(supabase, tenantId, query)
  if (user.isLegacy) {
    return rows.map((row) => mapProductResponse(user, row, []))
  }

  const stockMap = await buildStockMap(
    supabase,
    tenantId,
    rows.map((r) => r.id),
  )
  return rows.map((row) => mapProductResponse(user, row, stockMap.get(row.id) ?? []))
}

export async function createProduct(
  supabase: SupabaseClient,
  user: SessionUser,
  body: unknown,
) {
  assertCanCreateProduct(user)
  const parsed = ProductCreateSchema.parse(body)
  const tenantId = tenantIdFor(user)
  const row = await insertProdukti(supabase, tenantId, parsed)

  if (!user.isLegacy) {
    const lokacionet = await listLokacionetByOwner(supabase, tenantId)
    const stockRows: DynamicStockEntry[] = []
    for (const loc of lokacionet) {
      if (!isAdmin(user) && !hasMinimumAccess(user, loc.id, 'add')) continue
      let sasia = 0
      if (loc.kodi === 'XK') sasia = parsed.gjendje_kosove ?? 0
      if (loc.kodi === 'AL') sasia = parsed.gjendje_shqiperi ?? 0
      stockRows.push({ lokacioni_id: loc.id, sasia })
    }
    if (stockRows.length > 0) {
      await upsertGjendjeRows(
        supabase,
        tenantId,
        stockRows.map((s) => ({ produkti_id: row.id, ...s })),
      )
    }
    return mapProductResponse(user, row, stockRows)
  }

  await upsertGjendjeRows(supabase, tenantId, [
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
  const tenantId = tenantIdFor(user)
  const { stock, kodi, emri, gjendje_kosove, gjendje_shqiperi } = parsed

  const metadataChanged =
    kodi !== undefined || emri !== undefined || gjendje_kosove !== undefined || gjendje_shqiperi !== undefined

  if (!isAdmin(user) && metadataChanged) {
    throw new AppError(403, 'Only admins can edit product details')
  }

  if (!isAdmin(user) && stock?.length) {
    for (const row of stock) {
      requireLocationAccess(user, row.lokacioni_id, 'edit_delete')
    }
  }

  const produktiPatch: Partial<
    Pick<ProduktiRow, 'kodi' | 'emri' | 'gjendje_kosove' | 'gjendje_shqiperi'>
  > = {}
  if (kodi !== undefined) produktiPatch.kodi = kodi
  if (emri !== undefined) produktiPatch.emri = emri
  if (gjendje_kosove !== undefined) produktiPatch.gjendje_kosove = gjendje_kosove
  if (gjendje_shqiperi !== undefined) produktiPatch.gjendje_shqiperi = gjendje_shqiperi

  let row: ProduktiRow
  if (Object.keys(produktiPatch).length > 0) {
    row = await updateProdukti(supabase, tenantId, id, produktiPatch)
  } else {
    const existing = await findProduktiById(supabase, tenantId, id)
    if (!existing) throw new AppError(404, 'Product not found')
    row = existing
  }

  if (
    parsed.gjendje_kosove !== undefined ||
    parsed.gjendje_shqiperi !== undefined
  ) {
    await upsertGjendjeRows(supabase, tenantId, [
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
    const allowedStock = isAdmin(user)
      ? stock
      : stock.filter((s) => hasMinimumAccess(user, s.lokacioni_id, 'edit_delete'))
    if (allowedStock.length > 0) {
      await upsertGjendjeRows(
        supabase,
        tenantId,
        allowedStock.map((s) => ({
          produkti_id: row.id,
          lokacioni_id: s.lokacioni_id,
          sasia: s.sasia,
        })),
      )
    }
  }

  if (user.isLegacy) {
    return mapProductResponse(user, row, [])
  }

  const stockMap = await buildStockMap(supabase, tenantId, [row.id])
  return mapProductResponse(user, row, stockMap.get(row.id) ?? [])
}

export async function deleteProduct(
  supabase: SupabaseClient,
  user: SessionUser,
  id: string,
) {
  ProductIdParamsSchema.parse({ id })
  await assertCanDeleteProduct(supabase, user, id)
  await deleteProdukti(supabase, tenantIdFor(user), id)
  return { ok: true as const }
}
