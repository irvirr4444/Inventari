import ExcelJS from 'exceljs'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  BatchLlojiSchema,
  CountrySchema,
  SummaryGroupBySchema,
  VeprimLlojiSchema,
  buildGroupedSummaryRows,
  resolveActionCreatorUserId,
} from '@inventari/shared'
import { z } from 'zod'
import type { SessionUser } from '../../domain/user.js'
import { AppError } from '../../errors.js'
import {
  highestAccessInAnyLocation,
  isAdmin,
  listAllowedLocationIds,
  tenantIdFor,
} from '../access/index.js'
import { autoSizeColumns, applyBordersToDataRows, styleHeaderRow } from '../../excel.js'
import {
  type ActionExportRow,
  type DynamicActionExportRow,
  type DynamicProductExportRow,
  buildDynamicInventariExcelBuffer,
  buildInventariExcelBuffer,
  formatExportTimestamp,
  isWithinExportRange,
  permbledhjeExportFilename,
  buildProductGroupedInventariExcelBuffer,
  buildUserGroupedInventariExcelBuffer,
} from './excel/index.js'
import { resolveInventariExcelExportConfigForTenant } from './config/index.js'
import { exportHistoryXlsx, type HistoryExportQuery } from './history/index.js'
import { listLokacionetByOwner } from '../../repositories/lokacioniRepository.js'
import { listPerdoruesByAccount } from '../../repositories/perdoruesRepository.js'
import { listProduktet, listGjendjeForProducts } from '../../repositories/produktiRepository.js'
import {
  fetchExportDynamicActions,
  fetchExportLegacyActions,
  fetchExportLegacyProducts,
  fetchExportVeprimet,
} from '../../repositories/batchRepository.js'
import { getTrackPriceForTenant } from '../tenant/index.js'

function filterExportDynamicActions(
  user: SessionUser,
  actions: DynamicActionExportRow[],
  allowedLocationIds: Set<string>,
) {
  if (isAdmin(user)) return actions
  return actions.filter(
    (action) => action.lokacioni_id && allowedLocationIds.has(action.lokacioni_id),
  )
}

function buildGroupedRowsForExport(
  groupBy: 'product' | 'user',
  actions: DynamicActionExportRow[],
  query: { from?: string; to?: string },
  tenantId: string,
  products: Array<{ kodi: string; emri: string }>,
  users: Array<{ id: string; emri: string | null; email: string | null }>,
) {
  const actionsInRange = actions.filter((action) => isWithinExportRange(action, query))
  const productRows = actionsInRange.map((action) => ({
    lloji: action.lloji,
    kodi_produktit: action.kodi_produktit,
    sasia: action.sasia,
    totali: Number(action.cmimi_njesi ?? 0) * Number(action.sasia ?? 0),
  }))
  const userRows = actionsInRange.map((action) => ({
    lloji: action.lloji,
    created_by_user_id: resolveActionCreatorUserId(action, tenantId),
    sasia: action.sasia,
    totali: Number(action.cmimi_njesi ?? 0) * Number(action.sasia ?? 0),
  }))

  return buildGroupedSummaryRows(groupBy, {
    locationRows: [],
    productRows,
    userRows,
    locationIds: [],
    locations: [],
    products,
    users,
  })
}

async function loadDynamicExportContext(
  supabase: SupabaseClient,
  user: SessionUser,
  tenantId: string,
) {
  const [lokacionet, productRows, users, allActions] = await Promise.all([
    listLokacionetByOwner(supabase, tenantId),
    listProduktet(supabase, tenantId, {}),
    listPerdoruesByAccount(supabase, tenantId),
    fetchExportDynamicActions(supabase, tenantId),
  ])

  const allowedLocationIds = isAdmin(user)
    ? new Set(lokacionet.map((loc) => loc.id))
    : new Set(listAllowedLocationIds(user, 'view'))

  const filteredActions = filterExportDynamicActions(
    user,
    allActions as DynamicActionExportRow[],
    allowedLocationIds,
  )

  const stockRows = await listGjendjeForProducts(
    supabase,
    tenantId,
    productRows.map((p) => p.id),
  )
  const stockByProduct = new Map<string, Map<string, number>>()
  for (const row of stockRows) {
    const byLoc = stockByProduct.get(row.produkti_id) ?? new Map()
    byLoc.set(row.lokacioni_id, Number(row.sasia))
    stockByProduct.set(row.produkti_id, byLoc)
  }

  const products: DynamicProductExportRow[] = productRows.map((p) => ({
    kodi: p.kodi,
    emri: p.emri,
    stockByLocation: stockByProduct.get(p.id) ?? new Map(),
  }))

  const locationNameById = new Map(lokacionet.map((loc) => [loc.id, loc.emri]))
  const creatorLabelById = new Map(
    users.map((u) => [u.id, u.emri?.trim() || u.email?.trim() || u.id]),
  )

  return {
    lokacionet,
    products,
    users,
    filteredActions,
    locationNameById,
    creatorLabelById,
    productCatalog: productRows.map((p) => ({ kodi: p.kodi, emri: p.emri })),
    userCatalog: users.map((u) => ({ id: u.id, emri: u.emri, email: u.email })),
  }
}

function csvEscape(value: unknown) {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`
  return s
}

export async function exportActionsCsv(
  supabase: SupabaseClient,
  user: SessionUser,
  query: {
    shteti?: 'XK' | 'AL'
    from?: string
    to?: string
    lloji?: 'Hyrje' | 'Dalje'
  },
) {
  const tenantId = tenantIdFor(user)
  if (!isAdmin(user) && !highestAccessInAnyLocation(user, 'view')) {
    throw new AppError(403, 'No location access')
  }
  const rows = await fetchExportVeprimet(supabase, tenantId, query)

  const header = [
    'id',
    'lloji',
    'data',
    'shteti',
    'kodi_produktit',
    'cmimi_njesi',
    'sasia',
    'totali',
    'created_at',
  ]

  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.lloji,
        r.data,
        r.shteti,
        r.kodi_produktit,
        r.cmimi_njesi,
        r.sasia,
        r.totali,
        r.created_at,
      ]
        .map(csvEscape)
        .join(','),
    )
  }

  return lines.join('\n')
}

export async function exportProductsXlsx(
  supabase: SupabaseClient,
  user: SessionUser,
  query: {
    sortKey: 'kodi' | 'emri' | 'gjendje_kosove' | 'gjendje_shqiperi'
    sortDirection: 'asc' | 'desc'
  },
) {
  const tenantId = tenantIdFor(user)
  if (!isAdmin(user) && !highestAccessInAnyLocation(user, 'view')) {
    throw new AppError(403, 'No location access')
  }
  const productRows = await listProduktet(supabase, tenantId, {})

  if (user.isLegacy) {
    const sorted = [...productRows].sort((a, b) => {
      const multiplier = query.sortDirection === 'asc' ? 1 : -1
      const aValue = a[query.sortKey]
      const bValue = b[query.sortKey]

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * multiplier
      }

      return (
        String(aValue).localeCompare(String(bValue), undefined, {
          sensitivity: 'base',
          numeric: true,
        }) * multiplier
      )
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Produkte')
    sheet.addRow(['Kodi', 'Emri', 'Gjendje Kosove', 'Gjendje Shqiperi'])
    for (const p of sorted) {
      sheet.addRow([p.kodi, p.emri, p.gjendje_kosove, p.gjendje_shqiperi])
    }
    styleHeaderRow(sheet)
    applyBordersToDataRows(sheet, 2)
    autoSizeColumns(sheet, 120)
    return {
      buffer: await workbook.xlsx.writeBuffer(),
      filename: `Produkte ${formatExportTimestamp()}.xlsx`,
    }
  }

  const lokacionet = await listLokacionetByOwner(supabase, tenantId)
  const stockRows = await listGjendjeForProducts(
    supabase,
    tenantId,
    productRows.map((p) => p.id),
  )
  const stockByProduct = new Map<string, Map<string, number>>()
  for (const row of stockRows) {
    const byLoc = stockByProduct.get(row.produkti_id) ?? new Map()
    byLoc.set(row.lokacioni_id, Number(row.sasia))
    stockByProduct.set(row.produkti_id, byLoc)
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Produkte')
  sheet.addRow(['Kodi', 'Emri', ...lokacionet.map((l) => l.emri)])

  for (const p of productRows) {
    const stocks = stockByProduct.get(p.id)
    sheet.addRow([
      p.kodi,
      p.emri,
      ...lokacionet.map((l) => stocks?.get(l.id) ?? 0),
    ])
  }

  styleHeaderRow(sheet)
  applyBordersToDataRows(sheet, 2)
  autoSizeColumns(sheet, 120)
  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `Produkte ${formatExportTimestamp()}.xlsx`,
  }
}

async function exportDynamicInventariXlsx(
  supabase: SupabaseClient,
  user: SessionUser,
  query: { from?: string; to?: string; groupBy?: 'location' | 'product' | 'user' },
) {
  const tenantId = tenantIdFor(user)
  if (!isAdmin(user) && !highestAccessInAnyLocation(user, 'view')) {
    throw new AppError(403, 'No location access')
  }

  const groupBy = query.groupBy ?? 'location'
  const trackPrice = await getTrackPriceForTenant(supabase, tenantId)

  if (groupBy === 'product' || groupBy === 'user') {
    const ctx = await loadDynamicExportContext(supabase, user, tenantId)
    const groupedRows = buildGroupedRowsForExport(
      groupBy,
      ctx.filteredActions,
      query,
      tenantId,
      ctx.productCatalog,
      ctx.userCatalog,
    )
    const resolveCreator = (action: DynamicActionExportRow) =>
      resolveActionCreatorUserId(action, tenantId)
    const excelExport = await resolveInventariExcelExportConfigForTenant(
      supabase,
      tenantId,
      ctx.users,
      ctx.creatorLabelById,
    )

    const buffer =
      groupBy === 'product'
        ? await buildProductGroupedInventariExcelBuffer({
            productRows: ctx.products,
            actionRows: ctx.filteredActions,
            locations: ctx.lokacionet.map((l) => ({ emri: l.emri })),
            locationIds: ctx.lokacionet.map((l) => l.id),
            query,
            groupedRows,
            trackPrice,
            accountOwnerId: tenantId,
            locationNameById: ctx.locationNameById,
            resolveCreator,
            creatorLabelById: ctx.creatorLabelById,
            excelExport,
          })
        : await buildUserGroupedInventariExcelBuffer({
            productRows: ctx.products,
            actionRows: ctx.filteredActions,
            locations: ctx.lokacionet.map((l) => ({ emri: l.emri })),
            locationIds: ctx.lokacionet.map((l) => l.id),
            query,
            groupedRows,
            trackPrice,
            accountOwnerId: tenantId,
            locationNameById: ctx.locationNameById,
            resolveCreator,
            creatorLabelById: ctx.creatorLabelById,
            excelExport,
          })

    return {
      buffer,
      filename: permbledhjeExportFilename(groupBy),
    }
  }

  const ctx = await loadDynamicExportContext(supabase, user, tenantId)
  const excelExport = await resolveInventariExcelExportConfigForTenant(
    supabase,
    tenantId,
    ctx.users,
    ctx.creatorLabelById,
  )

  const buffer = await buildDynamicInventariExcelBuffer(
    ctx.products,
    ctx.filteredActions,
    ctx.lokacionet.map((l) => ({ emri: l.emri })),
    ctx.lokacionet.map((l) => l.id),
    query,
    excelExport,
  )

  return {
    buffer,
    filename: permbledhjeExportFilename('location'),
  }
}

export async function exportInventariXlsx(
  supabase: SupabaseClient,
  user: SessionUser,
  query: { from?: string; to?: string; groupBy?: 'location' | 'product' | 'user' },
) {
  if (!user.isLegacy) {
    return exportDynamicInventariXlsx(supabase, user, query)
  }

  const tenantId = tenantIdFor(user)
  if (!isAdmin(user) && !highestAccessInAnyLocation(user, 'view')) {
    throw new AppError(403, 'No location access')
  }

  const [products, allActions] = await Promise.all([
    fetchExportLegacyProducts(supabase, tenantId),
    fetchExportLegacyActions(supabase, tenantId),
  ])

  const buffer = await buildInventariExcelBuffer(
    products,
    allActions as ActionExportRow[],
    query,
  )

  return {
    buffer,
    filename: permbledhjeExportFilename('location'),
  }
}

export const ActionsExportQuerySchema = z.object({
  shteti: CountrySchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  lloji: VeprimLlojiSchema.optional(),
  groupBy: SummaryGroupBySchema.optional(),
})

export const ProductsExportQuerySchema = z.object({
  sortKey: z.enum(['kodi', 'emri', 'gjendje_kosove', 'gjendje_shqiperi']).default('kodi'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
})

export const HistoryExportQuerySchema = z.object({
  lloji: BatchLlojiSchema.optional(),
  llojet: z.array(BatchLlojiSchema).optional(),
  shteti: CountrySchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  shenim: z.string().optional(),
  locationId: z.string().optional(),
  locationIds: z.array(z.string().min(1)).optional(),
  oraFrom: z.string().optional(),
  oraDeri: z.string().optional(),
  pershkrimi: z.string().optional(),
  totaliMin: z.coerce.number().optional(),
  totaliMax: z.coerce.number().optional(),
  produkteMin: z.coerce.number().optional(),
  produkteMax: z.coerce.number().optional(),
  kodiProduktit: z.string().optional(),
  trackPrice: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
})

export const HistoryExportBodySchema = z.object({
  /** Optional: when omitted, backend resolves batches from filters. */
  batchIds: z.array(z.string().min(1)).optional(),
  lloji: BatchLlojiSchema.optional(),
  llojet: z.array(BatchLlojiSchema).optional(),
  shteti: CountrySchema.optional(),
  locationId: z.string().optional(),
  locationIds: z.array(z.string().min(1)).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  shenim: z.string().optional(),
  oraFrom: z.string().optional(),
  oraDeri: z.string().optional(),
  pershkrimi: z.string().optional(),
  totaliMin: z.coerce.number().optional(),
  totaliMax: z.coerce.number().optional(),
  produkteMin: z.coerce.number().optional(),
  produkteMax: z.coerce.number().optional(),
  kodiProduktit: z.string().optional(),
  trackPrice: z.boolean().optional(),
  locationLabel: z.string().optional(),
  filterLines: z.array(z.string()).optional(),
})

export {
  exportHistoryDocx,
  exportHistoryPdf,
  exportHistoryXlsx,
  type HistoryExportQuery,
} from './history/index.js'
