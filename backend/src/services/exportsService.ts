import ExcelJS from 'exceljs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CountrySchema, VeprimLlojiSchema } from '@inventari/shared'
import { z } from 'zod'
import { AppError } from '../errors.js'
import { autoSizeColumns, applyBordersToDataRows, styleHeaderRow } from '../excel.js'
import {
  type ActionExportRow,
  buildInventariExcelBuffer,
  formatExportTimestamp,
} from './inventariExcel.js'

function csvEscape(value: unknown) {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`
  return s
}

export async function queryActionsForExport(
  supabase: SupabaseClient,
  query: {
    shteti?: 'XK' | 'AL'
    from?: string
    to?: string
    lloji?: 'Hyrje' | 'Dalje'
  },
) {
  let q = supabase
    .from('veprimi')
    .select('*')
    .order('data', { ascending: true })
    .order('created_at', { ascending: true })

  if (query.shteti) q = q.eq('shteti', query.shteti)
  if (query.lloji) q = q.eq('lloji', query.lloji)
  if (query.from) q = q.gte('data', query.from)
  if (query.to) q = q.lte('data', query.to)

  const { data, error } = await q
  if (error) throw new AppError(500, error.message)
  return data ?? []
}

export async function exportActionsCsv(
  supabase: SupabaseClient,
  query: {
    shteti?: 'XK' | 'AL'
    from?: string
    to?: string
    lloji?: 'Hyrje' | 'Dalje'
  },
) {
  const rows = await queryActionsForExport(supabase, query)

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
  query: {
    sortKey: 'kodi' | 'emri' | 'gjendje_kosove' | 'gjendje_shqiperi'
    sortDirection: 'asc' | 'desc'
  },
) {
  const { data, error } = await supabase
    .from('produkti')
    .select('kodi,emri,gjendje_kosove,gjendje_shqiperi')

  if (error) throw new AppError(500, error.message)

  const productRows = [...(data ?? [])].sort((a, b) => {
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

  for (const p of productRows) {
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

export async function exportInventariXlsx(
  supabase: SupabaseClient,
  query: { from?: string; to?: string },
) {
  const [{ data: products, error: productsError }, { data: allActions, error: actionsError }] =
    await Promise.all([
      supabase
        .from('produkti')
        .select('kodi,emri,gjendje_kosove,gjendje_shqiperi')
        .order('emri', { ascending: true }),
      supabase
        .from('veprimi')
        .select('id,lloji,data,shteti,kodi_produktit,cmimi_njesi,sasia,created_at')
        .order('data', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true }),
    ])

  if (productsError) throw new AppError(500, productsError.message)
  if (actionsError) throw new AppError(500, actionsError.message)

  const buffer = await buildInventariExcelBuffer(
    products ?? [],
    (allActions ?? []) as ActionExportRow[],
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
