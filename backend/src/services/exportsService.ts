import ExcelJS from 'exceljs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildSummaryByLocation, CountrySchema, VeprimLlojiSchema } from '@inventari/shared'
import { z } from 'zod'
import { AppError } from '../errors.js'
import type { SessionUser } from '../domain/user.js'
import { autoSizeColumns, applyBordersToDataRows, styleHeaderRow } from '../excel.js'
import {
  type ActionExportRow,
  buildInventariExcelBuffer,
  formatExportTimestamp,
} from './inventariExcel.js'
import { listLokacionetByOwner } from '../repositories/lokacioniRepository.js'
import { getTenantConfigRow } from '../repositories/tenantConfigRepository.js'
import { listProduktet, listGjendjeForProducts } from '../repositories/produktiRepository.js'
import {
  fetchDynamicExportActions,
  fetchExportLegacyActions,
  fetchExportLegacyProducts,
  fetchExportVeprimet,
} from '../repositories/batchRepository.js'
import { listVeprimetForAnalytics } from '../repositories/veprimiRepository.js'

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
  const lokacionet = await listLokacionetByOwner(supabase, user.id)
  const lokacioniById = new Map(lokacionet.map((l) => [l.id, l.emri]))
  const actions = await fetchDynamicExportActions(supabase, user.id, query)
  const tenantConfig = await getTenantConfigRow(supabase, user.id)
  const trackPrice = tenantConfig?.track_price ?? true

  const workbook = new ExcelJS.Workbook()
  const movements = workbook.addWorksheet('Veprime')

  const movementHeaders = trackPrice
    ? ['Data', 'Lloji', 'Lokacioni', 'Kodi', 'Cmimi', 'Sasia', 'Totali']
    : ['Data', 'Lloji', 'Lokacioni', 'Kodi', 'Sasia']

  movements.addRow(movementHeaders)

  for (const row of actions) {
    if (trackPrice) {
      movements.addRow([
        row.data,
        row.lloji,
        lokacioniById.get(row.lokacioni_id ?? '') ?? '',
        row.kodi_produktit,
        row.cmimi_njesi,
        row.sasia,
        row.totali,
      ])
    } else {
      movements.addRow([
        row.data,
        row.lloji,
        lokacioniById.get(row.lokacioni_id ?? '') ?? '',
        row.kodi_produktit,
        row.sasia,
      ])
    }
  }

  styleHeaderRow(movements)
  applyBordersToDataRows(movements, 2)
  autoSizeColumns(movements, 120)

  const summaryRows = await listVeprimetForAnalytics(supabase, user.id, query)
  const summary = buildSummaryByLocation(
    summaryRows.map((r) => ({
      lloji: r.lloji as 'Hyrje' | 'Dalje',
      lokacioni_id: r.lokacioni_id ?? '',
      sasia: r.sasia,
      totali: r.totali,
    })),
    lokacionet.map((l) => l.id),
  )

  const pivot = workbook.addWorksheet('Permbledhje')
  if (trackPrice) {
    pivot.addRow(['Lokacioni', 'Hyrje Sasia', 'Hyrje Vlera', 'Dalje Sasia', 'Dalje Vlera'])
    for (const loc of lokacionet) {
      const s = summary[loc.id]
      pivot.addRow([
        loc.emri,
        s?.in_qty ?? 0,
        s?.in_value ?? 0,
        s?.out_qty ?? 0,
        s?.out_value ?? 0,
      ])
    }
  } else {
    pivot.addRow(['Lokacioni', 'Hyrje Sasia', 'Dalje Sasia'])
    for (const loc of lokacionet) {
      const s = summary[loc.id]
      pivot.addRow([loc.emri, s?.in_qty ?? 0, s?.out_qty ?? 0])
    }
  }
  styleHeaderRow(pivot)
  applyBordersToDataRows(pivot, 2)
  autoSizeColumns(pivot, 120)

  return {
    buffer: await workbook.xlsx.writeBuffer(),
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
