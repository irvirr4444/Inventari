import ExcelJS from 'exceljs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BatchLlojiSchema, CountrySchema, VeprimLlojiSchema } from '@inventari/shared'
import { z } from 'zod'
import type { SessionUser } from '../domain/user.js'
import { autoSizeColumns, applyBordersToDataRows, styleHeaderRow } from '../excel.js'
import {
  type ActionExportRow,
  type DynamicActionExportRow,
  type DynamicProductExportRow,
  buildDynamicInventariExcelBuffer,
  buildInventariExcelBuffer,
  formatExportTimestamp,
} from './inventariExcel.js'
import { exportHistoryXlsx, type HistoryExportQuery } from './historyExportService.js'
import { listLokacionetByOwner } from '../repositories/lokacioniRepository.js'
import { listProduktet, listGjendjeForProducts } from '../repositories/produktiRepository.js'
import {
  fetchExportDynamicActions,
  fetchExportLegacyActions,
  fetchExportLegacyProducts,
  fetchExportVeprimet,
} from '../repositories/batchRepository.js'

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
  const rows = await fetchExportVeprimet(supabase, user.id, query)

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
  const productRows = await listProduktet(supabase, user.id, {})

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

  const lokacionet = await listLokacionetByOwner(supabase, user.id)
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
  query: { from?: string; to?: string },
) {
  const [lokacionet, productRows, allActions] = await Promise.all([
    listLokacionetByOwner(supabase, user.id),
    listProduktet(supabase, user.id, {}),
    fetchExportDynamicActions(supabase, user.id),
  ])

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

  const products: DynamicProductExportRow[] = productRows.map((p) => ({
    kodi: p.kodi,
    emri: p.emri,
    stockByLocation: stockByProduct.get(p.id) ?? new Map(),
  }))

  const buffer = await buildDynamicInventariExcelBuffer(
    products,
    allActions as DynamicActionExportRow[],
    lokacionet.map((l) => ({ emri: l.emri })),
    lokacionet.map((l) => l.id),
    query,
  )

  return {
    buffer,
    filename: `Permbledhje ${formatExportTimestamp()}.xlsx`,
  }
}

export async function exportInventariXlsx(
  supabase: SupabaseClient,
  user: SessionUser,
  query: { from?: string; to?: string },
) {
  if (!user.isLegacy) {
    return exportDynamicInventariXlsx(supabase, user, query)
  }

  const [products, allActions] = await Promise.all([
    fetchExportLegacyProducts(supabase, user.id),
    fetchExportLegacyActions(supabase, user.id),
  ])

  const buffer = await buildInventariExcelBuffer(
    products,
    allActions as ActionExportRow[],
    query,
  )

  return {
    buffer,
    filename: `Permbledhje ${formatExportTimestamp()}.xlsx`,
  }
}

export const ActionsExportQuerySchema = z.object({
  shteti: CountrySchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  lloji: VeprimLlojiSchema.optional(),
})

export const ProductsExportQuerySchema = z.object({
  sortKey: z.enum(['kodi', 'emri', 'gjendje_kosove', 'gjendje_shqiperi']).default('kodi'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
})

export const HistoryExportQuerySchema = z.object({
  lloji: BatchLlojiSchema.optional(),
  shteti: CountrySchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  shenim: z.string().optional(),
  locationId: z.string().optional(),
  oraFrom: z.string().optional(),
  oraDeri: z.string().optional(),
  pershkrimi: z.string().optional(),
  totaliMin: z.coerce.number().optional(),
  totaliMax: z.coerce.number().optional(),
  produkteMin: z.coerce.number().optional(),
  produkteMax: z.coerce.number().optional(),
  trackPrice: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
})

export const HistoryExportBodySchema = z.object({
  batchIds: z.array(z.string().min(1)).min(1),
  lloji: BatchLlojiSchema.optional(),
  shteti: CountrySchema.optional(),
  locationId: z.string().optional(),
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
  trackPrice: z.boolean().optional(),
  locationLabel: z.string().optional(),
  filterLines: z.array(z.string()).optional(),
})

export {
  exportHistoryDocx,
  exportHistoryPdf,
  exportHistoryXlsx,
  type HistoryExportQuery,
} from './historyExportService.js'
