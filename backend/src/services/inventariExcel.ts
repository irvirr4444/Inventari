import ExcelJS from 'exceljs'
import fs from 'node:fs'
import path from 'node:path'
import { ERR_NO_ACTIONS_IN_PERIOD } from '@inventari/shared'
import { autoSizeColumns } from '../excel.js'

export const INVENTARI_EXPORT_COLS = 13

export type ProductExportRow = {
  kodi: string
  emri: string
  gjendje_kosove: number | null
  gjendje_shqiperi: number | null
}

export type ActionExportRow = {
  id: string
  lloji: 'Hyrje' | 'Dalje'
  data: string
  shteti: 'XK' | 'AL'
  kodi_produktit: string
  cmimi_njesi: number | string
  sasia: number
  created_at: string
}

export function signedQty(row: ActionExportRow) {
  const qty = Number(row.sasia ?? 0)
  return row.lloji === 'Dalje' ? -qty : qty
}

export function isWithinExportRange(row: ActionExportRow, query: { from?: string; to?: string }) {
  if (query.from && row.data < query.from) return false
  if (query.to && row.data > query.to) return false
  return true
}

export function transferKey(row: ActionExportRow) {
  return [row.data, row.kodi_produktit, String(row.cmimi_njesi), String(row.sasia)].join('|')
}

export function findExcelTemplatePath() {
  const candidates = [
    path.resolve(process.cwd(), 'docs/excel/Inventari Excel Template.xlsx'),
    path.resolve(process.cwd(), '../docs/excel/Inventari Excel Template.xlsx'),
    path.resolve(process.cwd(), '../../docs/excel/Inventari Excel Template.xlsx'),
  ]

  const templatePath = candidates.find((candidate) => fs.existsSync(candidate))
  if (!templatePath) {
    throw new Error('Excel template not found at docs/excel/Inventari Excel Template.xlsx')
  }
  return templatePath
}

export async function loadInventariTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(findExcelTemplatePath())

  const sheet = workbook.getWorksheet('Sheet1') ?? workbook.worksheets[0]
  if (!sheet) throw new Error('Excel template does not contain a worksheet.')

  for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    for (let col = 1; col <= INVENTARI_EXPORT_COLS; col += 1) {
      row.getCell(col).value = null
    }
  }

  return { workbook, sheet }
}

export function writeInventariDataRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  values: Array<string | number | null>,
) {
  const templateRow = sheet.getRow(3)
  const row = sheet.getRow(rowNumber)
  const dataBorder = {
    top: { style: 'thin', color: { argb: 'FFB7C9D9' } },
    left: { style: 'thin', color: { argb: 'FFB7C9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFB7C9D9' } },
    right: { style: 'thin', color: { argb: 'FFB7C9D9' } },
  } as const

  row.height = templateRow.height
  for (let col = 1; col <= INVENTARI_EXPORT_COLS; col += 1) {
    const cell = row.getCell(col)
    cell.style = { ...templateRow.getCell(col).style }
    cell.border = dataBorder
    cell.value = values[col - 1] ?? null
    cell.alignment = { ...cell.alignment, wrapText: false, vertical: 'middle' }
  }

  for (const col of [4, 6, 10, 12]) {
    row.getCell(col).numFmt = '#,##0.00'
  }
  for (const col of [5, 7, 11, 13]) {
    row.getCell(col).numFmt = '#,##0'
  }

  return row
}

export function clearInventariRowsAfterData(sheet: ExcelJS.Worksheet, firstEmptyRow: number) {
  for (let rowNumber = firstEmptyRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    for (let col = 1; col <= INVENTARI_EXPORT_COLS; col += 1) {
      const cell = row.getCell(col)
      cell.value = null
      cell.style = {}
    }
  }
}

export function sortActionExportRows(actionRows: ActionExportRow[]) {
  return [...actionRows].sort((a, b) => {
    const dateDiff = a.data.localeCompare(b.data)
    if (dateDiff !== 0) return dateDiff
    const createdDiff = a.created_at.localeCompare(b.created_at)
    if (createdDiff !== 0) return createdDiff

    const aIsKosovoOut = a.shteti === 'XK' && a.lloji === 'Dalje'
    const bIsKosovoOut = b.shteti === 'XK' && b.lloji === 'Dalje'
    const aIsAlbaniaIn = a.shteti === 'AL' && a.lloji === 'Hyrje'
    const bIsAlbaniaIn = b.shteti === 'AL' && b.lloji === 'Hyrje'

    if (transferKey(a) === transferKey(b)) {
      if (aIsKosovoOut && bIsAlbaniaIn) return -1
      if (aIsAlbaniaIn && bIsKosovoOut) return 1
    }

    return a.id.localeCompare(b.id)
  })
}

export function buildInventariExcelBuffer(
  productRows: ProductExportRow[],
  actionRows: ActionExportRow[],
  query: { from?: string; to?: string },
) {
  return buildInventariExcelBufferAsync(productRows, actionRows, query)
}

async function buildInventariExcelBufferAsync(
  productRows: ProductExportRow[],
  actionRows: ActionExportRow[],
  query: { from?: string; to?: string },
) {
  const sortedActions = sortActionExportRows(actionRows)
  const productsByCode = new Map(productRows.map((p) => [p.kodi, p]))
  const mirrorCounts = new Map<string, number>()

  for (const action of sortedActions) {
    if (action.shteti === 'XK' && action.lloji === 'Dalje') {
      const key = transferKey(action)
      mirrorCounts.set(key, (mirrorCounts.get(key) ?? 0) + 1)
    }
  }

  const currentStock = new Map<string, { XK: number; AL: number }>()
  const runningStock = new Map<string, { XK: number; AL: number }>()

  for (const p of productRows) {
    currentStock.set(p.kodi, {
      XK: Number(p.gjendje_kosove ?? 0),
      AL: Number(p.gjendje_shqiperi ?? 0),
    })
  }

  for (const action of sortedActions) {
    const stock = currentStock.get(action.kodi_produktit)
    if (!stock) continue
    stock[action.shteti] -= signedQty(action)
  }

  for (const [kodi, stock] of currentStock) {
    runningStock.set(kodi, { ...stock })
  }

  const actionsThroughTo = sortedActions.filter((action) => !query.to || action.data <= query.to)

  const { workbook, sheet } = await loadInventariTemplateWorkbook()
  let nextDataRow = 3

  for (const action of actionsThroughTo) {
    const product = productsByCode.get(action.kodi_produktit)
    const stock = runningStock.get(action.kodi_produktit)
    if (!product || !stock) continue

    const qty = signedQty(action)
    const unitPrice = Number(action.cmimi_njesi ?? 0)
    const key = transferKey(action)
    const isMirroredAlbaniaIn =
      action.shteti === 'AL' &&
      action.lloji === 'Hyrje' &&
      (mirrorCounts.get(key) ?? 0) > 0

    stock[action.shteti] += qty

    let rowValues: Array<string | number | null> | null = null

    if (isMirroredAlbaniaIn) {
      mirrorCounts.set(key, (mirrorCounts.get(key) ?? 1) - 1)
    } else if (isWithinExportRange(action, query)) {
      if (action.shteti === 'XK') {
        rowValues = [
          product.kodi,
          product.emri,
          action.data,
          unitPrice,
          qty,
          unitPrice * qty,
          stock.XK,
          '',
          '',
          '',
          '',
          '',
          '',
        ]

        if (action.lloji === 'Dalje') {
          const alQty = Number(action.sasia ?? 0)
          rowValues[8] = action.data
          rowValues[9] = unitPrice
          rowValues[10] = alQty
          rowValues[11] = unitPrice * alQty
          rowValues[12] = stock.AL + alQty
        }
      } else if (action.shteti === 'AL') {
        rowValues = [
          product.kodi,
          product.emri,
          '',
          '',
          '',
          '',
          '',
          '',
          action.data,
          unitPrice,
          qty,
          unitPrice * qty,
          stock.AL,
        ]
      }
    }

    if (rowValues) {
      writeInventariDataRow(sheet, nextDataRow, rowValues)
      nextDataRow += 1
    }
  }

  if (nextDataRow === 3) {
    writeInventariDataRow(sheet, nextDataRow, [
      '',
      ERR_NO_ACTIONS_IN_PERIOD,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ])
    nextDataRow += 1
  }

  clearInventariRowsAfterData(sheet, nextDataRow)
  autoSizeColumns(sheet, 120, INVENTARI_EXPORT_COLS)

  return workbook.xlsx.writeBuffer()
}

export function formatExportTimestamp() {
  const now = new Date()
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}
