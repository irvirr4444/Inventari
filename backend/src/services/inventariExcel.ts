import ExcelJS from 'exceljs'
import {
  ERR_NO_ACTIONS_IN_PERIOD,
  formatOraDisplay,
  resolveActionCreatorUserId,
  type GroupedSummaryRow,
} from '@inventari/shared'
import { applyBordersToDataRows, autoSizeColumns, styleHeaderRow } from '../excel.js'

export const INVENTARI_PRODUCT_COLS = 2
export const INVENTARI_LOCATION_BLOCK_COLS = 8
export const INVENTARI_SPACER_COLS = 1
export const INVENTARI_LEGACY_LOCATION_COUNT = 2
export const INVENTARI_EXPORT_COLS = inventariColumnCount(INVENTARI_LEGACY_LOCATION_COUNT)

const LOCATION_SUBHEADERS_FIRST = [
  'Përshkrimi',
  'Data',
  'Ora',
  'Cmimi/Njësi',
  'Sasi',
  'Vlefta',
  'Shënim për produktin',
  'Gjendje pas veprimit',
] as const

const LOCATION_SUBHEADERS_NEXT = [
  'Përshkrim',
  'Data',
  'Ora',
  'Cmimi/Njësi',
  'Sasi',
  'Vlefta',
  'Shënim për produktin',
  'Gjendje pas veprimit',
] as const

const INVENTARI_SPACER_WIDTH = 2
const INVENTARI_DATA_ROW_HEIGHT = 15
const INVENTARI_DEFAULT_COL_WIDTH = 12

const VEPRIM_DETAIL_HEADERS_WITHOUT_CREATOR = [
  'Kodi',
  'Produkti',
  'Përshkrimi',
  'Data',
  'Ora',
  'Cmimi/Njësi',
  'Sasi',
  'Vlefta',
  'Shënim për produktin',
  'Gjendje pas veprimit',
] as const

const VEPRIM_DETAIL_HEADERS_WITH_CREATOR = [
  'Kodi',
  'Produkti',
  'Perdoruesi',
  'Përshkrimi',
  'Data',
  'Ora',
  'Cmimi/Njësi',
  'Sasi',
  'Vlefta',
  'Shënim për produktin',
  'Gjendje pas veprimit',
] as const

const TRANSFER_SHEET_HEADERS_WITHOUT_CREATOR = [
  'Nga',
  'Te',
  'Kodi',
  'Produkti',
  'Përshkrimi',
  'Data',
  'Ora',
  'Cmimi/Njësi',
  'Sasi',
  'Vlefta',
  'Shënim për produktin',
] as const

const TRANSFER_SHEET_HEADERS_WITH_CREATOR = [
  'Krijuar nga',
  'Nga',
  'Te',
  'Kodi',
  'Produkti',
  'Përshkrimi',
  'Data',
  'Ora',
  'Cmimi/Njësi',
  'Sasi',
  'Vlefta',
  'Shënim për produktin',
] as const

export type InventariExcelExportOptions = {
  includeCreator?: boolean
}

export const DEFAULT_INVENTARI_EXCEL_EXPORT_OPTIONS: Required<InventariExcelExportOptions> = {
  includeCreator: false,
}

export function resolveInventariExcelExportOptions(
  overrides?: InventariExcelExportOptions,
): Required<InventariExcelExportOptions> {
  return {
    includeCreator:
      overrides?.includeCreator ?? DEFAULT_INVENTARI_EXCEL_EXPORT_OPTIONS.includeCreator,
  }
}

export function inventariExcelIncludesCreator(options?: InventariExcelExportOptions): boolean {
  return resolveInventariExcelExportOptions(options).includeCreator
}

function veprimDetailHeaders(includeCreator: boolean): readonly string[] {
  return includeCreator
    ? VEPRIM_DETAIL_HEADERS_WITH_CREATOR
    : VEPRIM_DETAIL_HEADERS_WITHOUT_CREATOR
}

function transferSheetHeaders(includeCreator: boolean): readonly string[] {
  return includeCreator
    ? TRANSFER_SHEET_HEADERS_WITH_CREATOR
    : TRANSFER_SHEET_HEADERS_WITHOUT_CREATOR
}

function listSheetPriceCols(includeCreator: boolean): readonly number[] {
  return includeCreator ? ([7, 9] as const) : ([6, 8] as const)
}

function listSheetQtyCols(includeCreator: boolean): readonly number[] {
  return includeCreator ? ([8, 11] as const) : ([7, 10] as const)
}

function veprimListTotalCols(includeCreator: boolean) {
  return includeCreator
    ? ({ label: 2, sasi: 8, vlefta: 9 } as const)
    : ({ label: 2, sasi: 7, vlefta: 8 } as const)
}

function transferSheetPriceCols(includeCreator: boolean): readonly number[] {
  return includeCreator ? ([9, 11] as const) : ([8, 10] as const)
}

function transferSheetQtyCols(includeCreator: boolean): readonly number[] {
  return includeCreator ? ([10] as const) : ([9] as const)
}

function transferLocationFilterIndices(includeCreator: boolean) {
  return includeCreator ? ({ from: 1, to: 2 } as const) : ({ from: 0, to: 1 } as const)
}

export type InventariExportCreatorContext = {
  creatorLabelById: Map<string, string>
  accountOwnerId: string
}

export type InventariExcelExportConfig = InventariExcelExportOptions & {
  creator?: InventariExportCreatorContext
}

export function resolveExportCreatorLabel(
  action: DynamicActionExportRow,
  config?: InventariExcelExportConfig,
): string {
  if (!inventariExcelIncludesCreator(config) || !config?.creator) return ''
  const id = resolveActionCreatorUserId(action, config.creator.accountOwnerId)
  return config.creator.creatorLabelById.get(id) ?? id
}

const PRODUCT_GROUP_DETAIL_META = ['Përshkrimi', 'Data', 'Ora', 'Vendndodhja'] as const
const PRODUCT_GROUP_DETAIL_TAIL_PRICE = [
  'Cmimi/Njësi',
  'Sasi',
  'Vlefta',
  'Shënim për produktin',
] as const
const PRODUCT_GROUP_DETAIL_TAIL_NO_PRICE = ['Sasi', 'Shënim për produktin'] as const

const USER_GROUP_DETAIL_META = ['Përshkrimi', 'Data', 'Ora', 'Vendndodhja'] as const
const USER_GROUP_DETAIL_TAIL_PRICE = [
  'Cmimi/Njësi',
  'Sasi',
  'Vlefta',
  'Shënim për produktin',
] as const
const USER_GROUP_DETAIL_TAIL_NO_PRICE = ['Sasi', 'Shënim për produktin'] as const

export const GROUPED_DETAIL_SHEET_CAP = 40

const LEGACY_NAV_LOCATIONS = [
  { key: 'XK', emri: 'Kosova' },
  { key: 'AL', emri: 'Shqiperi' },
] as const

export type ProductExportRow = {
  kodi: string
  emri: string
  gjendje_kosove: number | null
  gjendje_shqiperi: number | null
}

export type DynamicProductExportRow = {
  kodi: string
  emri: string
  stockByLocation: Map<string, number>
}

export type ActionExportBatchMeta = {
  ora: string | null
  pershkrimi: string | null
  lloji?: string | null
  shteti?: 'XK' | 'AL' | null
  destination_shteti?: 'XK' | 'AL' | null
  lokacioni_id?: string | null
  destination_lokacioni_id?: string | null
  created_by_user_id?: string | null
}

export type ActionExportRow = {
  id: string
  lloji: 'Hyrje' | 'Dalje'
  data: string
  shteti: 'XK' | 'AL'
  kodi_produktit: string
  cmimi_njesi: number | string
  sasia: number
  shenim?: string | null
  created_at: string
  batch_id?: string | null
  veprim_batch?: ActionExportBatchMeta | ActionExportBatchMeta[] | null
}

export type DynamicActionExportRow = {
  id: string
  lloji: 'Hyrje' | 'Dalje'
  data: string
  lokacioni_id: string | null
  kodi_produktit: string
  cmimi_njesi: number | string
  sasia: number
  shenim?: string | null
  created_at: string
  batch_id?: string | null
  veprim_batch?: ActionExportBatchMeta | ActionExportBatchMeta[] | null
}

export type InventariLocationHeader = {
  emri: string
}

type ActionWithBatchMeta = {
  shenim?: string | null
  created_at: string
  veprim_batch?: ActionExportBatchMeta | ActionExportBatchMeta[] | null
}

type LocationBlockValues = {
  pershkrimi: string
  data: string
  ora: string
  unitPrice: number
  qty: number
  value: number
  shenim: string
  gjendje: number
}

export function inventariColumnCount(locationCount: number) {
  if (locationCount <= 0) return INVENTARI_PRODUCT_COLS
  return (
    INVENTARI_PRODUCT_COLS +
    locationCount * INVENTARI_LOCATION_BLOCK_COLS +
    (locationCount - 1) * INVENTARI_SPACER_COLS
  )
}

export function locationBlockStartCol(blockIndex: number) {
  return (
    INVENTARI_PRODUCT_COLS +
    1 +
    blockIndex * (INVENTARI_LOCATION_BLOCK_COLS + INVENTARI_SPACER_COLS)
  )
}

export function inventariPriceCols(locationCount: number) {
  const cols: number[] = []
  for (let blockIndex = 0; blockIndex < locationCount; blockIndex += 1) {
    const start = locationBlockStartCol(blockIndex)
    cols.push(start + 3, start + 5)
  }
  return cols
}

export function inventariQtyCols(locationCount: number) {
  const cols: number[] = []
  for (let blockIndex = 0; blockIndex < locationCount; blockIndex += 1) {
    const start = locationBlockStartCol(blockIndex)
    cols.push(start + 4, start + 7)
  }
  return cols
}

const LOCATION_BLOCK_FILL_COLORS = [
  'FFC9DAF8',
  'FFFCE5CD',
  'FFD9EAD3',
  'FFE8D5F2',
  'FFFFF2CC',
  'FFF4CCCC',
  'FFD0E0E3',
  'FFE2EFDA',
] as const

const INVENTARI_DATA_BORDER = {
  top: { style: 'thin', color: { argb: 'FFB7C9D9' } },
  left: { style: 'thin', color: { argb: 'FFB7C9D9' } },
  bottom: { style: 'thin', color: { argb: 'FFB7C9D9' } },
  right: { style: 'thin', color: { argb: 'FFB7C9D9' } },
} as const

const INVENTARI_EMPTY_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'none' }

const INVENTARI_TOTAL_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFFFF' },
}

const INVENTARI_TOTAL_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 12,
}

export function inventariSpacerCols(locationCount: number) {
  const cols: number[] = []
  for (let blockIndex = 0; blockIndex < locationCount - 1; blockIndex += 1) {
    cols.push(locationBlockStartCol(blockIndex) + INVENTARI_LOCATION_BLOCK_COLS)
  }
  return cols
}

export function locationBlockIndexForCol(col: number, locationCount: number) {
  if (col <= INVENTARI_PRODUCT_COLS) return null
  for (let blockIndex = 0; blockIndex < locationCount; blockIndex += 1) {
    const start = locationBlockStartCol(blockIndex)
    if (col >= start && col < start + INVENTARI_LOCATION_BLOCK_COLS) return blockIndex
  }
  return null
}

function locationBlockFill(blockIndex: number): ExcelJS.Fill {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {
      argb: LOCATION_BLOCK_FILL_COLORS[blockIndex % LOCATION_BLOCK_FILL_COLORS.length],
    },
  }
}

function applySpacerCellStyle(cell: ExcelJS.Cell) {
  cell.value = null
  cell.fill = INVENTARI_EMPTY_FILL
  cell.border = {}
}

function applyInventariHeaderStyles(sheet: ExcelJS.Worksheet, locationCount: number) {
  const columnCount = inventariColumnCount(locationCount)
  const spacerCols = new Set(inventariSpacerCols(locationCount))

  for (const col of [1, 2]) {
    for (const rowNumber of [1, 2]) {
      const cell = sheet.getCell(rowNumber, col)
      cell.fill = INVENTARI_EMPTY_FILL
      cell.font = { bold: true, size: 11 }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
    }
  }

  for (let blockIndex = 0; blockIndex < locationCount; blockIndex += 1) {
    const start = locationBlockStartCol(blockIndex)
    const fill = locationBlockFill(blockIndex)

    sheet.getCell(1, start).fill = fill
    sheet.getCell(1, start).font = { bold: true, size: 11 }
    sheet.getCell(1, start).alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }

    for (let offset = 0; offset < INVENTARI_LOCATION_BLOCK_COLS; offset += 1) {
      const cell = sheet.getCell(2, start + offset)
      cell.fill = fill
      cell.font = { bold: true, size: 11 }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
    }
  }

  for (let col = 1; col <= sheet.columnCount; col += 1) {
    if (!spacerCols.has(col) && col <= columnCount) continue
    for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
      applySpacerCellStyle(sheet.getCell(rowNumber, col))
    }
  }
}

function resolveBatchMeta(action: ActionWithBatchMeta): ActionExportBatchMeta | null {
  const batch = action.veprim_batch
  if (!batch) return null
  return Array.isArray(batch) ? (batch[0] ?? null) : batch
}

export function exportPershkrimiForAction(action: ActionWithBatchMeta) {
  return resolveBatchMeta(action)?.pershkrimi?.trim() ?? ''
}

export function exportOraForAction(action: ActionWithBatchMeta) {
  const batchOra = resolveBatchMeta(action)?.ora
  if (!batchOra) return ''
  return formatOraDisplay(batchOra)
}

export function exportShenimForAction(action: ActionWithBatchMeta) {
  return action.shenim?.trim() ?? ''
}

function emptyInventariRow(columnCount: number) {
  return Array<string | number | null>(columnCount).fill('')
}

type LocationTotals = { sasi: number; vlefta: number }

function emptyLocationTotals(locationCount: number): LocationTotals[] {
  return Array.from({ length: locationCount }, () => ({ sasi: 0, vlefta: 0 }))
}

export function accumulatePërmbledhjeTotals(
  totals: LocationTotals[],
  rowValues: Array<string | number | null>,
  locationCount: number,
) {
  for (let blockIndex = 0; blockIndex < locationCount; blockIndex += 1) {
    const start = locationBlockStartCol(blockIndex) - 1
    const sasi = rowValues[start + 4]
    const vlefta = rowValues[start + 5]
    if (typeof sasi === 'number') totals[blockIndex].sasi += sasi
    if (typeof vlefta === 'number') totals[blockIndex].vlefta += vlefta
  }
}

export function buildPërmbledhjeTotalRow(
  totals: LocationTotals[],
  locationCount: number,
): Array<string | number | null> {
  const rowValues = emptyInventariRow(inventariColumnCount(locationCount))
  rowValues[1] = 'TOTAL:'
  for (let blockIndex = 0; blockIndex < locationCount; blockIndex += 1) {
    const start = locationBlockStartCol(blockIndex) - 1
    rowValues[start + 4] = totals[blockIndex].sasi
    rowValues[start + 5] = totals[blockIndex].vlefta
  }
  return rowValues
}

export function buildVeprimListTotalRow(
  rows: NavSheetRow[],
  columnCount?: number,
  includeCreator = false,
): NavSheetRow | null {
  if (rows.length === 0) return null

  const cols = veprimListTotalCols(includeCreator)
  const count = columnCount ?? veprimDetailHeaders(includeCreator).length

  let sasi = 0
  let vlefta = 0
  for (const row of rows) {
    const qty = row[cols.sasi - 1]
    const value = row[cols.vlefta - 1]
    if (typeof qty === 'number') sasi += qty
    if (typeof value === 'number') vlefta += value
  }

  const totalRow = Array<string | number | null>(count).fill('')
  totalRow[cols.label - 1] = 'TOTAL:'
  totalRow[cols.sasi - 1] = sasi
  totalRow[cols.vlefta - 1] = vlefta
  return totalRow
}

function setLocationBlock(
  rowValues: Array<string | number | null>,
  blockIndex: number,
  values: LocationBlockValues,
) {
  const start = locationBlockStartCol(blockIndex) - 1
  const ordered: Array<string | number> = [
    values.pershkrimi,
    values.data,
    values.ora,
    values.unitPrice,
    values.qty,
    values.value,
    values.shenim,
    values.gjendje,
  ]
  for (let offset = 0; offset < INVENTARI_LOCATION_BLOCK_COLS; offset += 1) {
    rowValues[start + offset] = ordered[offset]
  }
}

export function signedQty(row: { lloji: 'Hyrje' | 'Dalje'; sasia: number }) {
  const qty = Number(row.sasia ?? 0)
  return row.lloji === 'Dalje' ? -qty : qty
}

export function isWithinExportRange(
  row: { data: string },
  query: { from?: string; to?: string },
) {
  if (query.from && row.data < query.from) return false
  if (query.to && row.data > query.to) return false
  return true
}

export function transferKey(row: {
  data: string
  kodi_produktit: string
  cmimi_njesi: number | string
  sasia: number
}) {
  return [row.data, row.kodi_produktit, String(row.cmimi_njesi), String(row.sasia)].join('|')
}

function resetInventariCellStyle(cell: ExcelJS.Cell) {
  cell.style = {}
}

function unmergeAllCells(sheet: ExcelJS.Worksheet) {
  const merges = [...(sheet.model.merges ?? [])]
  for (const merge of merges) {
    sheet.unMergeCells(merge)
  }
}

function ensureInventariSheetColumns(sheet: ExcelJS.Worksheet, locationCount: number) {
  const targetCols = inventariColumnCount(locationCount)
  const spacerCols = new Set(inventariSpacerCols(locationCount))

  if (sheet.columnCount === 0) {
    for (let col = 1; col <= targetCols; col += 1) {
      sheet.getColumn(col).width = spacerCols.has(col)
        ? INVENTARI_SPACER_WIDTH
        : INVENTARI_DEFAULT_COL_WIDTH
    }
    return
  }

  const insertUnit = INVENTARI_LOCATION_BLOCK_COLS + INVENTARI_SPACER_COLS
  while (sheet.columnCount < targetCols) {
    const insertAt = sheet.columnCount + 1
    sheet.spliceColumns(insertAt, 0, ...Array.from({ length: insertUnit }, () => []))
  }

  for (let col = 1; col <= targetCols; col += 1) {
    sheet.getColumn(col).width = spacerCols.has(col)
      ? INVENTARI_SPACER_WIDTH
      : INVENTARI_DEFAULT_COL_WIDTH
  }
}

export function configureInventariLocationHeaders(
  sheet: ExcelJS.Worksheet,
  locations: InventariLocationHeader[],
) {
  const locationCount = locations.length
  const columnCount = inventariColumnCount(locationCount)

  ensureInventariSheetColumns(sheet, locationCount)
  unmergeAllCells(sheet)

  for (let rowNumber = 1; rowNumber <= 2; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    for (let col = 1; col <= sheet.columnCount; col += 1) {
      row.getCell(col).value = col <= columnCount ? row.getCell(col).value : null
    }
  }

  sheet.mergeCells(1, 1, 1, INVENTARI_PRODUCT_COLS)
  sheet.getCell(1, 1).value = 'PRODUKTI'
  sheet.getCell(1, 2).value = null

  sheet.getCell(2, 1).value = 'Kodi'
  sheet.getCell(2, 2).value = 'Produkti'

  for (let blockIndex = 0; blockIndex < locationCount; blockIndex += 1) {
    const startCol = locationBlockStartCol(blockIndex)
    sheet.mergeCells(1, startCol, 1, startCol + INVENTARI_LOCATION_BLOCK_COLS - 1)
    sheet.getCell(1, startCol).value = locations[blockIndex]?.emri ?? ''

    const subheaders =
      blockIndex === 0 ? LOCATION_SUBHEADERS_FIRST : LOCATION_SUBHEADERS_NEXT
    for (let offset = 0; offset < INVENTARI_LOCATION_BLOCK_COLS; offset += 1) {
      sheet.getCell(2, startCol + offset).value = subheaders[offset]
    }

    if (blockIndex < locationCount - 1) {
      const spacerCol = startCol + INVENTARI_LOCATION_BLOCK_COLS
      applySpacerCellStyle(sheet.getCell(1, spacerCol))
      applySpacerCellStyle(sheet.getCell(2, spacerCol))
    }
  }

  applyInventariHeaderStyles(sheet, locationCount)
}

export async function createInventariWorkbook(locationCount = INVENTARI_LEGACY_LOCATION_COUNT) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Sheet1')
  const columnCount = inventariColumnCount(locationCount)

  ensureInventariSheetColumns(sheet, locationCount)
  sheet.getRow(3).height = INVENTARI_DATA_ROW_HEIGHT

  return { workbook, sheet, columnCount }
}

export function writeInventariDataRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  values: Array<string | number | null>,
  locationCount = INVENTARI_LEGACY_LOCATION_COUNT,
) {
  const columnCount = inventariColumnCount(locationCount)
  const row = sheet.getRow(rowNumber)
  const spacerCols = new Set(inventariSpacerCols(locationCount))

  row.height = sheet.getRow(3).height ?? INVENTARI_DATA_ROW_HEIGHT
  for (let col = 1; col <= columnCount; col += 1) {
    const cell = row.getCell(col)
    const value = values[col - 1] ?? null

    if (spacerCols.has(col)) {
      resetInventariCellStyle(cell)
      applySpacerCellStyle(cell)
      continue
    }

    const blockIndex = locationBlockIndexForCol(col, locationCount)
    resetInventariCellStyle(cell)
    cell.value = value
    cell.alignment = { wrapText: false, vertical: 'middle' }
    cell.border = INVENTARI_DATA_BORDER
    cell.fill = blockIndex === null ? INVENTARI_EMPTY_FILL : locationBlockFill(blockIndex)
  }

  for (const col of inventariPriceCols(locationCount)) {
    row.getCell(col).numFmt = '#,##0.00'
  }
  for (const col of inventariQtyCols(locationCount)) {
    row.getCell(col).numFmt = '#,##0'
  }

  return row
}

function writeInventariTotalRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  values: Array<string | number | null>,
  locationCount = INVENTARI_LEGACY_LOCATION_COUNT,
) {
  const columnCount = inventariColumnCount(locationCount)
  const row = sheet.getRow(rowNumber)
  const spacerCols = new Set(inventariSpacerCols(locationCount))

  row.height = 20

  for (let col = 1; col <= columnCount; col += 1) {
    const cell = row.getCell(col)
    const value = values[col - 1] ?? null

    if (spacerCols.has(col)) {
      resetInventariCellStyle(cell)
      applySpacerCellStyle(cell)
      continue
    }

    resetInventariCellStyle(cell)
    cell.value = value
    cell.fill = INVENTARI_TOTAL_FILL
    cell.border = INVENTARI_DATA_BORDER
    cell.alignment = { wrapText: false, vertical: 'middle' }
    if (value !== null && value !== '') {
      cell.font = INVENTARI_TOTAL_FONT
    }
  }

  for (const col of inventariPriceCols(locationCount)) {
    row.getCell(col).numFmt = '#,##0.00'
  }
  for (const col of inventariQtyCols(locationCount)) {
    row.getCell(col).numFmt = '#,##0'
  }

  return row
}

export function clearInventariRowsAfterData(
  sheet: ExcelJS.Worksheet,
  firstEmptyRow: number,
  locationCount = INVENTARI_LEGACY_LOCATION_COUNT,
) {
  const columnCount = inventariColumnCount(locationCount)
  const spacerCols = new Set(inventariSpacerCols(locationCount))
  for (let rowNumber = firstEmptyRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    for (let col = 1; col <= columnCount; col += 1) {
      const cell = row.getCell(col)
      if (spacerCols.has(col)) {
        applySpacerCellStyle(cell)
      } else {
        cell.value = null
        cell.style = {}
      }
    }
  }
}

export function sortActionExportRows(actionRows: ActionExportRow[]) {
  return [...actionRows].sort((a, b) => {
    const dateDiff = a.data.localeCompare(b.data)
    if (dateDiff !== 0) return dateDiff
    const createdDiff = a.created_at.localeCompare(b.created_at)
    if (createdDiff !== 0) return createdDiff

    const batchA = resolveBatchMeta(a)
    const batchB = resolveBatchMeta(b)
    if (
      batchA?.lloji === 'Transfer' &&
      batchB?.lloji === 'Transfer' &&
      a.batch_id &&
      a.batch_id === b.batch_id
    ) {
      if (a.lloji === 'Dalje' && b.lloji === 'Hyrje') return -1
      if (a.lloji === 'Hyrje' && b.lloji === 'Dalje') return 1
    }

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

function isLegacyTransferDestinationRow(action: ActionExportRow) {
  const batch = resolveBatchMeta(action)
  return (
    batch?.lloji === 'Transfer' &&
    action.lloji === 'Hyrje' &&
    batch.destination_shteti != null &&
    action.shteti === batch.destination_shteti
  )
}

function legacyTransferDestination(
  action: ActionExportRow,
  actionRows: ActionExportRow[],
): 'XK' | 'AL' | null {
  const batch = resolveBatchMeta(action)
  if (batch?.lloji === 'Transfer' && action.lloji === 'Dalje' && batch.destination_shteti) {
    return batch.destination_shteti
  }
  if (action.lloji === 'Dalje' && legacyHasMirrorPair(action, actionRows)) {
    return 'AL'
  }
  return null
}

export function sortDynamicActionExportRows(actionRows: DynamicActionExportRow[]) {
  return [...actionRows].sort((a, b) => {
    const dateDiff = a.data.localeCompare(b.data)
    if (dateDiff !== 0) return dateDiff
    const createdDiff = a.created_at.localeCompare(b.created_at)
    if (createdDiff !== 0) return createdDiff

    const batchA = resolveBatchMeta(a)
    const batchB = resolveBatchMeta(b)
    if (
      batchA?.lloji === 'Transfer' &&
      batchB?.lloji === 'Transfer' &&
      a.batch_id &&
      a.batch_id === b.batch_id
    ) {
      if (a.lloji === 'Dalje' && b.lloji === 'Hyrje') return -1
      if (a.lloji === 'Hyrje' && b.lloji === 'Dalje') return 1
    }

    return a.id.localeCompare(b.id)
  })
}

function isTransferDestinationRow(action: DynamicActionExportRow) {
  const batch = resolveBatchMeta(action)
  return (
    batch?.lloji === 'Transfer' &&
    action.lloji === 'Hyrje' &&
    action.lokacioni_id != null &&
    action.lokacioni_id === batch.destination_lokacioni_id
  )
}

function buildLocationBlockValues(
  action: ActionWithBatchMeta & {
    data: string
    cmimi_njesi: number | string
    sasia: number
  },
  unitPrice: number,
  qty: number,
  gjendje: number,
): LocationBlockValues {
  return {
    pershkrimi: exportPershkrimiForAction(action),
    data: action.data,
    ora: exportOraForAction(action),
    unitPrice,
    qty,
    value: unitPrice * qty,
    shenim: exportShenimForAction(action),
    gjendje,
  }
}

type ProductLookup = { kodi: string; emri: string }
export type NavSheetRow = Array<string | number | null>

export type DynamicInventariNavigation = {
  hyrjeRows: Map<string, NavSheetRow[]>
  daljeRows: Map<string, NavSheetRow[]>
  transferRows: NavSheetRow[]
}

export type PreparedDynamicInventariWorkbook = {
  workbook: ExcelJS.Workbook
  mainSheet: ExcelJS.Worksheet
  locationCount: number
  navLocations: Array<{ key: string; emri: string }>
  locationIds: string[]
  navigation: DynamicInventariNavigation
  productsByCode: Map<string, ProductLookup>
}

function inventariCellDisplayLength(value: unknown, numFmt?: string): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') {
    if (numFmt?.includes('#,##0.00')) {
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).length
    }
    if (numFmt?.includes('#,##0')) {
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 }).length
    }
    return String(value).length
  }
  if (value instanceof Date) return value.toLocaleDateString('en-GB').length
  return String(value).length
}

function autoSizeInventariSheet(sheet: ExcelJS.Worksheet, locationCount: number) {
  const columnCount = inventariColumnCount(locationCount)
  const spacerCols = new Set(inventariSpacerCols(locationCount))

  for (let col = 1; col <= columnCount; col += 1) {
    if (spacerCols.has(col)) {
      sheet.getColumn(col).width = INVENTARI_SPACER_WIDTH
      continue
    }

    let maxLen = 8
    for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const cell = sheet.getRow(rowNumber).getCell(col)
      const value = cell.value
      if (value === null || value === undefined || value === '') continue
      maxLen = Math.max(maxLen, inventariCellDisplayLength(value, cell.numFmt))
    }

    sheet.getColumn(col).width = Math.min(maxLen + 2, 120)
  }
}

export function sanitizeExcelSheetName(raw: string, used: Set<string>) {
  let name = raw.replace(/[\\/*?:[\]]/g, '').trim()
  if (!name) name = 'Sheet'
  name = name.slice(0, 31)

  let candidate = name
  let suffix = 2
  while (used.has(candidate)) {
    const tail = ` ${suffix}`
    candidate = `${name.slice(0, Math.max(1, 31 - tail.length))}${tail}`
    suffix += 1
  }

  used.add(candidate)
  return candidate
}

function buildVeprimDetailRow(
  product: ProductLookup,
  action: ActionWithBatchMeta & {
    data: string
    cmimi_njesi: number | string
    sasia: number
    lloji: 'Hyrje' | 'Dalje'
  },
  qty: number,
  gjendje: number,
  creatorLabel = '',
  includeCreator = false,
): NavSheetRow {
  const unitPrice = Number(action.cmimi_njesi ?? 0)
  const row: NavSheetRow = [
    product.kodi,
    product.emri,
    exportPershkrimiForAction(action),
    action.data,
    exportOraForAction(action),
    unitPrice,
    qty,
    unitPrice * qty,
    exportShenimForAction(action),
    gjendje,
  ]
  if (includeCreator) {
    row.splice(2, 0, creatorLabel)
  }
  return row
}

function buildTransferDetailRow(
  fromLabel: string,
  toLabel: string,
  product: ProductLookup,
  action: ActionWithBatchMeta & {
    data: string
    cmimi_njesi: number | string
    sasia: number
  },
  creatorLabel = '',
  includeCreator = false,
): NavSheetRow {
  const unitPrice = Number(action.cmimi_njesi ?? 0)
  const qty = Number(action.sasia ?? 0)
  const row: NavSheetRow = [
    fromLabel,
    toLabel,
    product.kodi,
    product.emri,
    exportPershkrimiForAction(action),
    action.data,
    exportOraForAction(action),
    unitPrice,
    qty,
    unitPrice * qty,
    exportShenimForAction(action),
  ]
  if (includeCreator) {
    row.unshift(creatorLabel)
  }
  return row
}

function applyListSheetNumberFormats(
  sheet: ExcelJS.Worksheet,
  priceCols: readonly number[],
  qtyCols: readonly number[],
) {
  sheet.eachRow({ includeEmpty: false }, (row) => {
    if (row.number === 1) return
    for (const col of priceCols) row.getCell(col).numFmt = '#,##0.00'
    for (const col of qtyCols) row.getCell(col).numFmt = '#,##0'
  })
}

const LIST_ROW_FILL_WHITE: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFFFF' },
}

const LIST_ROW_FILL_GREY: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2F2F2' },
}

function applyZebraStripesToListSheet(
  sheet: ExcelJS.Worksheet,
  startRow = 2,
  endRow = sheet.rowCount,
) {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const fill =
      (rowNumber - startRow) % 2 === 0 ? LIST_ROW_FILL_WHITE : LIST_ROW_FILL_GREY
    sheet.getRow(rowNumber).eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = fill
    })
  }
}

const LIST_TOTAL_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 12,
}

const HISTORY_SECTION_TITLE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFC9DAF8' },
}

const HISTORY_SECTION_TITLE_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 12,
}

const HISTORY_SECTION_HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9D9D9' },
}

const HISTORY_SECTION_HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 11,
}

type HistoryExportSection = {
  title: string
  kind: HistoryExportSheetPlan['kind']
  headers: readonly string[]
  rows: NavSheetRow[]
  priceCols: readonly number[]
  qtyCols: readonly number[]
}

function resolveHistoryExportSection(
  plan: HistoryExportSheetPlan,
  navigation: {
    hyrjeRows: Map<string, NavSheetRow[]>
    daljeRows: Map<string, NavSheetRow[]>
    transferRows: NavSheetRow[]
  },
  transferLocationEmri: string | undefined,
  includeCreator: boolean,
): HistoryExportSection {
  if (plan.kind === 'transfer') {
    let rows = navigation.transferRows
    const transferIndices = transferLocationFilterIndices(includeCreator)
    if (transferLocationEmri) {
      rows = rows.filter(
        (row) =>
          row[transferIndices.from] === transferLocationEmri ||
          row[transferIndices.to] === transferLocationEmri,
      )
    }
    return {
      title: plan.title,
      kind: plan.kind,
      headers: transferSheetHeaders(includeCreator),
      rows,
      priceCols: transferSheetPriceCols(includeCreator),
      qtyCols: transferSheetQtyCols(includeCreator),
    }
  }

  const rows =
    plan.kind === 'hyrje'
      ? (navigation.hyrjeRows.get(plan.locationKey!) ?? [])
      : (navigation.daljeRows.get(plan.locationKey!) ?? [])

  return {
    title: plan.title,
    kind: plan.kind,
    headers: veprimDetailHeaders(includeCreator),
    rows,
    priceCols: listSheetPriceCols(includeCreator),
    qtyCols: listSheetQtyCols(includeCreator),
  }
}

function styleHistorySectionTitleRow(sheet: ExcelJS.Worksheet, rowNumber: number, columnCount: number) {
  const row = sheet.getRow(rowNumber)
  for (let col = 1; col <= columnCount; col += 1) {
    const cell = row.getCell(col)
    cell.fill = HISTORY_SECTION_TITLE_FILL
    cell.font = HISTORY_SECTION_TITLE_FONT
    cell.alignment = { vertical: 'middle' }
  }
}

function styleHistorySectionHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number, columnCount: number) {
  const row = sheet.getRow(rowNumber)
  for (let col = 1; col <= columnCount; col += 1) {
    const cell = row.getCell(col)
    cell.fill = HISTORY_SECTION_HEADER_FILL
    cell.font = HISTORY_SECTION_HEADER_FONT
    cell.alignment = { vertical: 'middle', wrapText: false }
  }
}

function applyListSheetNumberFormatsOnRows(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  priceCols: readonly number[],
  qtyCols: readonly number[],
) {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    for (const col of priceCols) row.getCell(col).numFmt = '#,##0.00'
    for (const col of qtyCols) row.getCell(col).numFmt = '#,##0'
  }
}

function createHistoryCombinedSheet(
  workbook: ExcelJS.Workbook,
  sections: HistoryExportSection[],
  includeCreator: boolean,
) {
  const sheet = workbook.addWorksheet('Histori')
  let isFirstSection = true

  for (const section of sections) {
    if (!isFirstSection) {
      sheet.addRow([])
    }
    isFirstSection = false

    const columnCount = section.headers.length
    const titleRowNumber = sheet.rowCount + 1
    sheet.addRow([section.title])
    sheet.mergeCells(titleRowNumber, 1, titleRowNumber, columnCount)
    styleHistorySectionTitleRow(sheet, titleRowNumber, columnCount)

    const headerRowNumber = sheet.rowCount + 1
    sheet.addRow([...section.headers])
    styleHistorySectionHeaderRow(sheet, headerRowNumber, columnCount)

    const dataStartRow = sheet.rowCount + 1
    for (const row of section.rows) {
      sheet.addRow(row)
    }
    const dataEndRow = sheet.rowCount

    if (dataEndRow >= dataStartRow) {
      applyListSheetNumberFormatsOnRows(
        sheet,
        dataStartRow,
        dataEndRow,
        section.priceCols,
        section.qtyCols,
      )
      applyZebraStripesToListSheet(sheet, dataStartRow, dataEndRow)
    }

    if (section.kind !== 'transfer' && section.rows.length > 0) {
      const totalRow = buildVeprimListTotalRow(section.rows, columnCount, includeCreator)
      if (totalRow) {
        sheet.addRow(totalRow)
        applyNavSheetTotalRowStyle(sheet, sheet.rowCount, columnCount)
      }
    } else if (section.rows.length === 0) {
      sheet.addRow(['', ERR_NO_ACTIONS_IN_PERIOD])
    }
  }

  if (sheet.rowCount >= 2) {
    applyBordersToDataRows(sheet, 2)
  }
  autoSizeColumns(sheet, 120)
  return sheet
}

function applyNavSheetTotalRowStyle(sheet: ExcelJS.Worksheet, rowNumber: number, columnCount: number) {
  const row = sheet.getRow(rowNumber)
  for (let col = 1; col <= columnCount; col += 1) {
    const cell = row.getCell(col)
    cell.fill = LIST_ROW_FILL_WHITE
    const value = cell.value
    if (value !== null && value !== '') {
      cell.font = LIST_TOTAL_FONT
    }
  }
}

function createListSheet(
  workbook: ExcelJS.Workbook,
  title: string,
  headers: readonly string[],
  rows: NavSheetRow[],
  usedNames: Set<string>,
  priceCols: readonly number[],
  qtyCols: readonly number[],
  options?: { includeTotal?: boolean; includeCreator?: boolean },
) {
  const sheet = workbook.addWorksheet(sanitizeExcelSheetName(title, usedNames))
  const includeCreator = options?.includeCreator ?? false
  sheet.addRow([...headers])
  for (const row of rows) sheet.addRow(row)

  let totalRowNumber: number | null = null
  if (options?.includeTotal) {
    const totalRow = buildVeprimListTotalRow(rows, headers.length, includeCreator)
    if (totalRow) {
      sheet.addRow(totalRow)
      totalRowNumber = sheet.rowCount
    }
  }

  const dataEndRow = totalRowNumber ? totalRowNumber - 1 : sheet.rowCount
  styleHeaderRow(sheet)
  applyBordersToDataRows(sheet, 2)
  applyListSheetNumberFormats(sheet, priceCols, qtyCols)
  if (dataEndRow >= 2) {
    applyZebraStripesToListSheet(sheet, 2, dataEndRow)
  }
  if (totalRowNumber) {
    applyNavSheetTotalRowStyle(sheet, totalRowNumber, headers.length)
  }
  autoSizeColumns(sheet, 120)
  return sheet
}

function initNavRowBuckets(locationKeys: string[]) {
  const hyrjeRows = new Map<string, NavSheetRow[]>()
  const daljeRows = new Map<string, NavSheetRow[]>()
  for (const key of locationKeys) {
    hyrjeRows.set(key, [])
    daljeRows.set(key, [])
  }
  return { hyrjeRows, daljeRows, transferRows: [] as NavSheetRow[] }
}

function finalizeInventariWorkbook(
  workbook: ExcelJS.Workbook,
  mainSheet: ExcelJS.Worksheet,
  locationCount: number,
  locations: Array<{ key: string; emri: string }>,
  navigation: {
    hyrjeRows: Map<string, NavSheetRow[]>
    daljeRows: Map<string, NavSheetRow[]>
    transferRows: NavSheetRow[]
  },
  includeCreator = false,
) {
  mainSheet.name = 'Përmbledhje'
  autoSizeInventariSheet(mainSheet, locationCount)

  const detailHeaders = veprimDetailHeaders(includeCreator)
  const priceCols = listSheetPriceCols(includeCreator)
  const qtyCols = listSheetQtyCols(includeCreator)

  const usedNames = new Set<string>(['Përmbledhje'])
  for (const location of locations) {
    createListSheet(
      workbook,
      `${location.emri} Hyrje`,
      detailHeaders,
      navigation.hyrjeRows.get(location.key) ?? [],
      usedNames,
      priceCols,
      qtyCols,
      { includeTotal: true, includeCreator },
    )
    createListSheet(
      workbook,
      `${location.emri} Dalje`,
      detailHeaders,
      navigation.daljeRows.get(location.key) ?? [],
      usedNames,
      priceCols,
      qtyCols,
      { includeTotal: true, includeCreator },
    )
  }

  createListSheet(
    workbook,
    'Transfer',
    transferSheetHeaders(includeCreator),
    navigation.transferRows,
    usedNames,
    transferSheetPriceCols(includeCreator),
    transferSheetQtyCols(includeCreator),
    { includeCreator },
  )
}

function legacyHasMirrorPair(action: ActionExportRow, actionRows: ActionExportRow[]) {
  if (action.shteti !== 'XK' || action.lloji !== 'Dalje') return false
  const key = transferKey(action)
  return actionRows.some(
    (row) => row.shteti === 'AL' && row.lloji === 'Hyrje' && transferKey(row) === key,
  )
}

function collectLegacyNavigationRow(
  navigation: ReturnType<typeof initNavRowBuckets>,
  locations: Array<{ key: string; emri: string }>,
  product: ProductLookup,
  action: ActionExportRow,
  qty: number,
  gjendje: number,
  actionRows: ActionExportRow[],
  transferDestGjendje?: number,
) {
  const batch = resolveBatchMeta(action)
  const detailRow = buildVeprimDetailRow(product, action, qty, gjendje)
  const locationKey = action.shteti
  const destinationShteti = legacyTransferDestination(action, actionRows)

  if (destinationShteti && action.lloji === 'Dalje') {
    const from = locations.find((loc) => loc.key === action.shteti)?.emri ?? action.shteti
    const to = locations.find((loc) => loc.key === destinationShteti)?.emri ?? destinationShteti
    const transferQty = Number(action.sasia ?? 0)
    navigation.transferRows.push(buildTransferDetailRow(from, to, product, action))
    navigation.daljeRows.get(locationKey)?.push(detailRow)
    navigation.hyrjeRows.get(destinationShteti)?.push(
      buildVeprimDetailRow(
        product,
        { ...action, lloji: 'Hyrje' },
        transferQty,
        transferDestGjendje ?? transferQty,
      ),
    )
    return
  }

  if (action.lloji === 'Hyrje') {
    navigation.hyrjeRows.get(locationKey)?.push(detailRow)
    return
  }

  navigation.daljeRows.get(locationKey)?.push(detailRow)
}

function collectDynamicNavigationRow(
  navigation: ReturnType<typeof initNavRowBuckets>,
  locations: Array<{ key: string; emri: string }>,
  locationIds: string[],
  product: ProductLookup,
  action: DynamicActionExportRow,
  qty: number,
  gjendje: number,
  transferDestGjendje?: number,
  exportConfig?: InventariExcelExportConfig,
) {
  const includeCreator = inventariExcelIncludesCreator(exportConfig)
  const locationId = action.lokacioni_id
  if (!locationId) return

  const creatorLabel = resolveExportCreatorLabel(action, exportConfig)
  const detailRow = buildVeprimDetailRow(
    product,
    action,
    qty,
    gjendje,
    creatorLabel,
    includeCreator,
  )
  const batch = resolveBatchMeta(action)
  const locationEmri = locations[locationIds.indexOf(locationId)]?.emri ?? ''

  if (batch?.lloji === 'Transfer' && action.lloji === 'Dalje' && batch.destination_lokacioni_id) {
    const destId = batch.destination_lokacioni_id
    const destEmri = locations[locationIds.indexOf(destId)]?.emri ?? ''
    const transferQty = Number(action.sasia ?? 0)
    navigation.transferRows.push(
      buildTransferDetailRow(locationEmri, destEmri, product, action, creatorLabel, includeCreator),
    )
    navigation.daljeRows.get(locationId)?.push(detailRow)
    navigation.hyrjeRows.get(destId)?.push(
      buildVeprimDetailRow(
        product,
        { ...action, lloji: 'Hyrje' },
        transferQty,
        transferDestGjendje ?? transferQty,
        creatorLabel,
        includeCreator,
      ),
    )
    return
  }

  if (action.lloji === 'Hyrje') {
    navigation.hyrjeRows.get(locationId)?.push(detailRow)
  } else {
    navigation.daljeRows.get(locationId)?.push(detailRow)
  }
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
  const locationCount = INVENTARI_LEGACY_LOCATION_COUNT
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
  const locations = [...LEGACY_NAV_LOCATIONS]
  const navigation = initNavRowBuckets(locations.map((loc) => loc.key))

  const { workbook, sheet, columnCount } = await createInventariWorkbook(locationCount)
  configureInventariLocationHeaders(
    sheet,
    locations.map((location) => ({ emri: location.emri })),
  )
  const permbledhjeTotals = emptyLocationTotals(locationCount)
  let nextDataRow = 3

  for (const action of actionsThroughTo) {
    const product = productsByCode.get(action.kodi_produktit)
    const stock = runningStock.get(action.kodi_produktit)
    if (!product || !stock) continue

    const qty = signedQty(action)
    const unitPrice = Number(action.cmimi_njesi ?? 0)
    const key = transferKey(action)
    const destinationShteti = legacyTransferDestination(action, sortedActions)
    const isMirroredAlbaniaIn =
      action.shteti === 'AL' &&
      action.lloji === 'Hyrje' &&
      (mirrorCounts.get(key) ?? 0) > 0

    stock[action.shteti] += qty

    let rowValues: Array<string | number | null> | null = null

    if (isLegacyTransferDestinationRow(action)) {
      continue
    }

    if (isMirroredAlbaniaIn) {
      mirrorCounts.set(key, (mirrorCounts.get(key) ?? 1) - 1)
    } else if (isWithinExportRange(action, query)) {
      const transferDestGjendje =
        destinationShteti && action.lloji === 'Dalje'
          ? stock[destinationShteti] + Number(action.sasia ?? 0)
          : undefined

      collectLegacyNavigationRow(
        navigation,
        locations,
        product,
        action,
        qty,
        action.shteti === 'XK' ? stock.XK : stock.AL,
        sortedActions,
        transferDestGjendje,
      )

      const blockValues = buildLocationBlockValues(
        action,
        unitPrice,
        qty,
        action.shteti === 'XK' ? stock.XK : stock.AL,
      )

      rowValues = emptyInventariRow(columnCount)
      rowValues[0] = product.kodi
      rowValues[1] = product.emri

      const sourceBlockIndex = action.shteti === 'XK' ? 0 : 1
      setLocationBlock(rowValues, sourceBlockIndex, blockValues)

      if (destinationShteti && action.lloji === 'Dalje') {
        const destBlockIndex = destinationShteti === 'XK' ? 0 : 1
        const destQty = Number(action.sasia ?? 0)
        setLocationBlock(
          rowValues,
          destBlockIndex,
          buildLocationBlockValues(
            action,
            unitPrice,
            destQty,
            stock[destinationShteti] + destQty,
          ),
        )
      }
    }

    if (rowValues) {
      accumulatePërmbledhjeTotals(permbledhjeTotals, rowValues, locationCount)
      writeInventariDataRow(sheet, nextDataRow, rowValues, locationCount)
      nextDataRow += 1
    }
  }

  if (nextDataRow > 3) {
    writeInventariTotalRow(
      sheet,
      nextDataRow,
      buildPërmbledhjeTotalRow(permbledhjeTotals, locationCount),
      locationCount,
    )
    nextDataRow += 1
  }

  if (nextDataRow === 3) {
    const emptyRow = emptyInventariRow(columnCount)
    emptyRow[1] = ERR_NO_ACTIONS_IN_PERIOD
    writeInventariDataRow(sheet, nextDataRow, emptyRow, locationCount)
    nextDataRow += 1
  }

  clearInventariRowsAfterData(sheet, nextDataRow, locationCount)
  finalizeInventariWorkbook(workbook, sheet, locationCount, locations, navigation)

  return workbook.xlsx.writeBuffer()
}

export async function prepareDynamicInventariWorkbook(
  productRows: DynamicProductExportRow[],
  actionRows: DynamicActionExportRow[],
  locations: InventariLocationHeader[],
  locationIds: string[],
  query: { from?: string; to?: string },
  exportConfig?: InventariExcelExportConfig,
): Promise<PreparedDynamicInventariWorkbook> {
  const locationCount = locations.length
  const columnCount = inventariColumnCount(locationCount)
  const locationIndex = new Map(locationIds.map((id, index) => [id, index]))
  const sortedActions = sortDynamicActionExportRows(actionRows)
  const productsByCode = new Map(productRows.map((p) => [p.kodi, p]))

  const currentStock = new Map<string, Map<string, number>>()
  const runningStock = new Map<string, Map<string, number>>()

  for (const product of productRows) {
    const stock = new Map<string, number>()
    for (const locationId of locationIds) {
      stock.set(locationId, Number(product.stockByLocation.get(locationId) ?? 0))
    }
    currentStock.set(product.kodi, stock)
  }

  for (const action of sortedActions) {
    const stock = currentStock.get(action.kodi_produktit)
    const locationId = action.lokacioni_id
    if (!stock || !locationId) continue
    stock.set(locationId, (stock.get(locationId) ?? 0) - signedQty(action))
  }

  for (const [kodi, stock] of currentStock) {
    runningStock.set(kodi, new Map(stock))
  }

  const actionsThroughTo = sortedActions.filter((action) => !query.to || action.data <= query.to)
  const navLocations = locationIds.map((id, index) => ({
    key: id,
    emri: locations[index]?.emri ?? id,
  }))
  const navigation = initNavRowBuckets(locationIds)

  const { workbook, sheet } = await createInventariWorkbook(locationCount)
  configureInventariLocationHeaders(sheet, locations)
  const permbledhjeTotals = emptyLocationTotals(locationCount)
  let nextDataRow = 3

  for (const action of actionsThroughTo) {
    const product = productsByCode.get(action.kodi_produktit)
    const stock = runningStock.get(action.kodi_produktit)
    const locationId = action.lokacioni_id
    const blockIndex = locationId ? locationIndex.get(locationId) : undefined
    if (!product || !stock || !locationId || blockIndex === undefined) continue

    const qty = signedQty(action)
    const unitPrice = Number(action.cmimi_njesi ?? 0)
    const batch = resolveBatchMeta(action)

    stock.set(locationId, (stock.get(locationId) ?? 0) + qty)

    let rowValues: Array<string | number | null> | null = null

    if (isTransferDestinationRow(action)) {
      continue
    }

    if (isWithinExportRange(action, query)) {
      collectDynamicNavigationRow(
        navigation,
        navLocations,
        locationIds,
        product,
        action,
        qty,
        stock.get(locationId) ?? 0,
        batch?.lloji === 'Transfer' &&
          action.lloji === 'Dalje' &&
          batch.destination_lokacioni_id
          ? (stock.get(batch.destination_lokacioni_id) ?? 0) + Number(action.sasia ?? 0)
          : undefined,
        exportConfig,
      )

      rowValues = emptyInventariRow(columnCount)
      rowValues[0] = product.kodi
      rowValues[1] = product.emri

      setLocationBlock(
        rowValues,
        blockIndex,
        buildLocationBlockValues(action, unitPrice, qty, stock.get(locationId) ?? 0),
      )

      if (
        batch?.lloji === 'Transfer' &&
        action.lloji === 'Dalje' &&
        batch.destination_lokacioni_id
      ) {
        const destinationIndex = locationIndex.get(batch.destination_lokacioni_id)
        if (destinationIndex !== undefined) {
          const transferQty = Number(action.sasia ?? 0)
          setLocationBlock(
            rowValues,
            destinationIndex,
            buildLocationBlockValues(
              action,
              unitPrice,
              transferQty,
              (stock.get(batch.destination_lokacioni_id) ?? 0) + transferQty,
            ),
          )
        }
      }
    }

    if (rowValues) {
      accumulatePërmbledhjeTotals(permbledhjeTotals, rowValues, locationCount)
      writeInventariDataRow(sheet, nextDataRow, rowValues, locationCount)
      nextDataRow += 1
    }
  }

  if (nextDataRow > 3) {
    writeInventariTotalRow(
      sheet,
      nextDataRow,
      buildPërmbledhjeTotalRow(permbledhjeTotals, locationCount),
      locationCount,
    )
    nextDataRow += 1
  }

  if (nextDataRow === 3) {
    const emptyRow = emptyInventariRow(columnCount)
    emptyRow[1] = ERR_NO_ACTIONS_IN_PERIOD
    writeInventariDataRow(sheet, nextDataRow, emptyRow, locationCount)
    nextDataRow += 1
  }

  clearInventariRowsAfterData(sheet, nextDataRow, locationCount)

  return {
    workbook,
    mainSheet: sheet,
    locationCount,
    navLocations,
    locationIds,
    navigation,
    productsByCode,
  }
}

export function finalizeMainPermbledhjeSheet(
  mainSheet: ExcelJS.Worksheet,
  locationCount: number,
) {
  mainSheet.name = 'Përmbledhje'
  autoSizeInventariSheet(mainSheet, locationCount)
}

export function workbookUsedSheetNames(workbook: ExcelJS.Workbook) {
  return new Set(workbook.worksheets.map((sheet) => sheet.name))
}

export function writeGroupedSummarySheet(
  workbook: ExcelJS.Workbook,
  sheetTitle: string,
  rows: GroupedSummaryRow[],
  options: { trackPrice: boolean; note?: string; usedNames?: Set<string> },
) {
  const usedNames = options.usedNames ?? workbookUsedSheetNames(workbook)
  const sheet = workbook.addWorksheet(sanitizeExcelSheetName(sheetTitle, usedNames))

  const headers = options.trackPrice
    ? [
        'Grupi',
        'Hyrje (sasi)',
        'Hyrje (vlera)',
        'Dalje (sasi)',
        'Dalje (vlera)',
        'Neto (sasi)',
        'Neto (vlera)',
      ]
    : ['Grupi', 'Hyrje (sasi)', 'Dalje (sasi)', 'Neto (sasi)']

  sheet.addRow(headers)

  if (options.note) {
    const noteRow = sheet.addRow([options.note])
    noteRow.font = { italic: true, size: 10 }
    sheet.mergeCells(noteRow.number, 1, noteRow.number, headers.length)
  }

  if (rows.length === 0) {
    sheet.addRow([ERR_NO_ACTIONS_IN_PERIOD])
  } else {
    for (const row of rows) {
      const netQty = row.in_qty - row.out_qty
      const netValue = row.in_value - row.out_value
      sheet.addRow(
        options.trackPrice
          ? [
              row.label,
              row.in_qty,
              row.in_value,
              row.out_qty,
              row.out_value,
              netQty,
              netValue,
            ]
          : [row.label, row.in_qty, row.out_qty, netQty],
      )
    }

    const totals = rows.reduce(
      (acc, row) => ({
        in_qty: acc.in_qty + row.in_qty,
        in_value: acc.in_value + row.in_value,
        out_qty: acc.out_qty + row.out_qty,
        out_value: acc.out_value + row.out_value,
      }),
      { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 },
    )
    const netQty = totals.in_qty - totals.out_qty
    const netValue = totals.in_value - totals.out_value
    sheet.addRow(
      options.trackPrice
        ? [
            'TOTAL:',
            totals.in_qty,
            totals.in_value,
            totals.out_qty,
            totals.out_value,
            netQty,
            netValue,
          ]
        : ['TOTAL:', totals.in_qty, totals.out_qty, netQty],
    )
  }

  styleHeaderRow(sheet)
  applyBordersToDataRows(sheet, 2)
  if (options.trackPrice) {
    applyListSheetNumberFormats(sheet, [3, 5, 7], [2, 4, 6])
  } else {
    applyListSheetNumberFormats(sheet, [], [2, 3, 4])
  }
  autoSizeColumns(sheet, 120)
  return sheet
}

function productGroupDetailHeaders(trackPrice: boolean, includeCreator: boolean) {
  const middle = includeCreator ? (['Perdoruesi'] as const) : ([] as const)
  const tail = trackPrice ? PRODUCT_GROUP_DETAIL_TAIL_PRICE : PRODUCT_GROUP_DETAIL_TAIL_NO_PRICE
  return [...PRODUCT_GROUP_DETAIL_META, ...middle, ...tail]
}

function userGroupDetailHeaders(trackPrice: boolean, includeCreator: boolean) {
  const middle = includeCreator ? (['Perdoruesi', 'Produkti'] as const) : (['Produkti'] as const)
  const tail = trackPrice ? USER_GROUP_DETAIL_TAIL_PRICE : USER_GROUP_DETAIL_TAIL_NO_PRICE
  return [...USER_GROUP_DETAIL_META, ...middle, ...tail]
}

function groupedDetailColumnLayout(
  mode: 'product' | 'user',
  trackPrice: boolean,
  includeCreator: boolean,
) {
  if (mode === 'product') {
    return trackPrice
      ? {
          qtyCol: includeCreator ? 7 : 6,
          valueCol: includeCreator ? 8 : 7,
          priceCols: includeCreator ? ([6, 8] as const) : ([5, 7] as const),
        }
      : {
          qtyCol: includeCreator ? 6 : 5,
          valueCol: null,
          priceCols: [] as const,
        }
  }
  return trackPrice
    ? {
        qtyCol: includeCreator ? 8 : 7,
        valueCol: includeCreator ? 9 : 8,
        priceCols: includeCreator ? ([7, 9] as const) : ([6, 8] as const),
      }
    : {
        qtyCol: includeCreator ? 7 : 6,
        valueCol: null,
        priceCols: [] as const,
      }
}

function buildProductGroupDetailRow(
  action: DynamicActionExportRow,
  locationName: string,
  creatorLabel: string,
  trackPrice: boolean,
  includeCreator: boolean,
): NavSheetRow {
  const unitPrice = Number(action.cmimi_njesi ?? 0)
  const qty = Number(action.sasia ?? 0)
  const base: NavSheetRow = [
    exportPershkrimiForAction(action),
    action.data,
    exportOraForAction(action),
    locationName,
  ]
  if (includeCreator) base.push(creatorLabel)
  if (!trackPrice) {
    return [...base, qty, exportShenimForAction(action)]
  }
  return [...base, unitPrice, qty, unitPrice * qty, exportShenimForAction(action)]
}

function buildUserGroupDetailRow(
  action: DynamicActionExportRow,
  product: ProductLookup,
  locationName: string,
  creatorLabel: string,
  trackPrice: boolean,
  includeCreator: boolean,
): NavSheetRow {
  const unitPrice = Number(action.cmimi_njesi ?? 0)
  const qty = Number(action.sasia ?? 0)
  const base: NavSheetRow = [
    exportPershkrimiForAction(action),
    action.data,
    exportOraForAction(action),
    locationName,
  ]
  if (includeCreator) {
    base.push(creatorLabel, product.emri)
  } else {
    base.push(product.emri)
  }
  if (!trackPrice) {
    return [...base, qty, exportShenimForAction(action)]
  }
  return [...base, unitPrice, qty, unitPrice * qty, exportShenimForAction(action)]
}

function groupedDetailListTotalRow(
  rows: NavSheetRow[],
  labelCol: number,
  qtyCol: number,
  valueCol: number | null,
): NavSheetRow | null {
  if (rows.length === 0) return null
  let qty = 0
  let value = 0
  for (const row of rows) {
    const rowQty = row[qtyCol - 1]
    const rowValue = valueCol ? row[valueCol - 1] : null
    if (typeof rowQty === 'number') qty += rowQty
    if (typeof rowValue === 'number') value += rowValue
  }
  const totalRow = Array<string | number | null>(rows[0]?.length ?? 0).fill('')
  totalRow[labelCol - 1] = 'TOTAL:'
  totalRow[qtyCol - 1] = qty
  if (valueCol) totalRow[valueCol - 1] = value
  return totalRow
}

function addGroupedDetailListSheet(
  workbook: ExcelJS.Workbook,
  title: string,
  headers: readonly string[],
  rows: NavSheetRow[],
  usedNames: Set<string>,
  trackPrice: boolean,
  qtyCol: number,
  valueCol: number | null,
  priceCols: readonly number[],
) {
  const sheet = workbook.addWorksheet(sanitizeExcelSheetName(title, usedNames))
  sheet.addRow([...headers])
  for (const row of rows) sheet.addRow(row)
  const totalRow = groupedDetailListTotalRow(rows, 1, qtyCol, valueCol)
  if (totalRow) {
    sheet.addRow(totalRow)
    applyNavSheetTotalRowStyle(sheet, sheet.rowCount, headers.length)
  }
  styleHeaderRow(sheet)
  applyBordersToDataRows(sheet, 2)
  if (trackPrice && priceCols.length > 0) {
    applyListSheetNumberFormats(sheet, priceCols, [qtyCol])
  } else {
    applyListSheetNumberFormats(sheet, [], [qtyCol])
  }
  if (sheet.rowCount >= 2) {
    applyZebraStripesToListSheet(sheet, 2, totalRow ? sheet.rowCount - 1 : sheet.rowCount)
  }
  autoSizeColumns(sheet, 120)
}

export function writeTransferListSheet(
  workbook: ExcelJS.Workbook,
  transferRows: NavSheetRow[],
  usedNames: Set<string>,
  options: { trackPrice: boolean; includeCreator?: boolean },
) {
  const includeCreator = options.includeCreator ?? false
  const priceCols = options.trackPrice ? transferSheetPriceCols(includeCreator) : ([] as const)
  createListSheet(
    workbook,
    'Transfer',
    transferSheetHeaders(includeCreator),
    transferRows,
    usedNames,
    priceCols,
    transferSheetQtyCols(includeCreator),
    { includeCreator },
  )
}

type GroupedDetailPlan = {
  key: string
  label: string
  activity: number
}

export function planGroupedDetailSheets(
  groupedRows: GroupedSummaryRow[],
  cap = GROUPED_DETAIL_SHEET_CAP,
) {
  const sorted = [...groupedRows].sort((a, b) => {
    const activityA = a.in_qty + a.out_qty
    const activityB = b.in_qty + b.out_qty
    if (activityB !== activityA) return activityB - activityA
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true })
  })
  const featured = sorted.slice(0, cap)
  const remainder = sorted.slice(cap)
  const note =
    remainder.length > 0
      ? `Detajet e grupimeve shtesë (${remainder.length}) janë përmbledhur në "Të tjerë Hyrje/Dalje".`
      : undefined
  return { featured, remainder, note }
}

export function collectProductGroupedDetailRows(
  actions: DynamicActionExportRow[],
  productsByCode: Map<string, ProductLookup>,
  locationNameById: Map<string, string>,
  creatorLabelById: Map<string, string>,
  accountOwnerId: string,
  resolveCreator: (action: DynamicActionExportRow) => string,
  query: { from?: string; to?: string },
  trackPrice: boolean,
  includeCreator = false,
) {
  const hyrjeRows = new Map<string, NavSheetRow[]>()
  const daljeRows = new Map<string, NavSheetRow[]>()

  for (const action of sortDynamicActionExportRows(actions)) {
    if (!isWithinExportRange(action, query)) continue
    const product = productsByCode.get(action.kodi_produktit)
    if (!product) continue
    const key = action.kodi_produktit
    const locationName = action.lokacioni_id
      ? (locationNameById.get(action.lokacioni_id) ?? '')
      : ''
    const creatorId = includeCreator ? resolveCreator(action) || accountOwnerId : ''
    const creatorLabel = includeCreator ? (creatorLabelById.get(creatorId) ?? creatorId) : ''

    if (isTransferDestinationRow(action)) continue

    const batch = resolveBatchMeta(action)
    if (action.lloji === 'Hyrje') {
      const rows = hyrjeRows.get(key) ?? []
      rows.push(
        buildProductGroupDetailRow(
          action,
          locationName,
          creatorLabel,
          trackPrice,
          includeCreator,
        ),
      )
      hyrjeRows.set(key, rows)
      continue
    }

    const rows = daljeRows.get(key) ?? []
    rows.push(
      buildProductGroupDetailRow(action, locationName, creatorLabel, trackPrice, includeCreator),
    )
    daljeRows.set(key, rows)

    if (batch?.lloji === 'Transfer' && batch.destination_lokacioni_id) {
      const destName = locationNameById.get(batch.destination_lokacioni_id) ?? ''
      const transferQty = Number(action.sasia ?? 0)
      const hyrje = hyrjeRows.get(key) ?? []
      hyrje.push(
        buildProductGroupDetailRow(
          { ...action, lloji: 'Hyrje', sasia: transferQty },
          destName,
          creatorLabel,
          trackPrice,
          includeCreator,
        ),
      )
      hyrjeRows.set(key, hyrje)
    }
  }

  return { hyrjeRows, daljeRows }
}

export function collectUserGroupedDetailRows(
  actions: DynamicActionExportRow[],
  productsByCode: Map<string, ProductLookup>,
  locationNameById: Map<string, string>,
  creatorLabelById: Map<string, string>,
  accountOwnerId: string,
  resolveCreator: (action: DynamicActionExportRow) => string,
  query: { from?: string; to?: string },
  trackPrice: boolean,
  includeCreator = false,
) {
  const hyrjeRows = new Map<string, NavSheetRow[]>()
  const daljeRows = new Map<string, NavSheetRow[]>()

  for (const action of sortDynamicActionExportRows(actions)) {
    if (!isWithinExportRange(action, query)) continue
    const product = productsByCode.get(action.kodi_produktit)
    if (!product) continue
    const key = resolveCreator(action) || accountOwnerId
    const locationName = action.lokacioni_id
      ? (locationNameById.get(action.lokacioni_id) ?? '')
      : ''
    const creatorLabel = includeCreator ? (creatorLabelById.get(key) ?? key) : ''

    if (isTransferDestinationRow(action)) continue

    const batch = resolveBatchMeta(action)
    if (action.lloji === 'Hyrje') {
      const rows = hyrjeRows.get(key) ?? []
      rows.push(
        buildUserGroupDetailRow(
          action,
          product,
          locationName,
          creatorLabel,
          trackPrice,
          includeCreator,
        ),
      )
      hyrjeRows.set(key, rows)
      continue
    }

    const rows = daljeRows.get(key) ?? []
    rows.push(
      buildUserGroupDetailRow(
        action,
        product,
        locationName,
        creatorLabel,
        trackPrice,
        includeCreator,
      ),
    )
    daljeRows.set(key, rows)

    if (batch?.lloji === 'Transfer' && batch.destination_lokacioni_id) {
      const destName = locationNameById.get(batch.destination_lokacioni_id) ?? ''
      const transferQty = Number(action.sasia ?? 0)
      const hyrje = hyrjeRows.get(key) ?? []
      hyrje.push(
        buildUserGroupDetailRow(
          { ...action, lloji: 'Hyrje', sasia: transferQty },
          product,
          destName,
          creatorLabel,
          trackPrice,
          includeCreator,
        ),
      )
      hyrjeRows.set(key, hyrje)
    }
  }

  return { hyrjeRows, daljeRows }
}

export function writeGroupedEntityDetailSheets(input: {
  workbook: ExcelJS.Workbook
  usedNames: Set<string>
  featured: GroupedDetailPlan[]
  remainder: GroupedDetailPlan[]
  hyrjeRows: Map<string, NavSheetRow[]>
  daljeRows: Map<string, NavSheetRow[]>
  mode: 'product' | 'user'
  trackPrice: boolean
  includeCreator?: boolean
}) {
  const includeCreator = input.includeCreator ?? false
  const headers =
    input.mode === 'product'
      ? productGroupDetailHeaders(input.trackPrice, includeCreator)
      : userGroupDetailHeaders(input.trackPrice, includeCreator)
  const { qtyCol, valueCol, priceCols } = groupedDetailColumnLayout(
    input.mode,
    input.trackPrice,
    includeCreator,
  )
  const suffixReserve = 7

  for (const group of input.featured) {
    const baseName = group.label.slice(0, Math.max(1, 31 - suffixReserve))
    addGroupedDetailListSheet(
      input.workbook,
      `${baseName} Hyrje`,
      headers,
      input.hyrjeRows.get(group.key) ?? [],
      input.usedNames,
      input.trackPrice,
      qtyCol,
      valueCol,
      priceCols,
    )
    addGroupedDetailListSheet(
      input.workbook,
      `${baseName} Dalje`,
      headers,
      input.daljeRows.get(group.key) ?? [],
      input.usedNames,
      input.trackPrice,
      qtyCol,
      valueCol,
      priceCols,
    )
  }

  if (input.remainder.length === 0) return

  const otherHyrje: NavSheetRow[] = []
  const otherDalje: NavSheetRow[] = []
  for (const group of input.remainder) {
    otherHyrje.push(...(input.hyrjeRows.get(group.key) ?? []))
    otherDalje.push(...(input.daljeRows.get(group.key) ?? []))
  }

  addGroupedDetailListSheet(
    input.workbook,
    'Të tjerë Hyrje',
    headers,
    otherHyrje,
    input.usedNames,
    input.trackPrice,
    qtyCol,
    valueCol,
    priceCols,
  )
  addGroupedDetailListSheet(
    input.workbook,
    'Të tjerë Dalje',
    headers,
    otherDalje,
    input.usedNames,
    input.trackPrice,
    qtyCol,
    valueCol,
    priceCols,
  )
}

export async function buildDynamicInventariExcelBuffer(
  productRows: DynamicProductExportRow[],
  actionRows: DynamicActionExportRow[],
  locations: InventariLocationHeader[],
  locationIds: string[],
  query: { from?: string; to?: string },
  exportConfig?: InventariExcelExportConfig,
) {
  const excelOptions = resolveInventariExcelExportOptions(exportConfig)
  const prepared = await prepareDynamicInventariWorkbook(
    productRows,
    actionRows,
    locations,
    locationIds,
    query,
    exportConfig,
  )
  finalizeInventariWorkbook(
    prepared.workbook,
    prepared.mainSheet,
    prepared.locationCount,
    prepared.navLocations,
    prepared.navigation,
    excelOptions.includeCreator,
  )
  return prepared.workbook.xlsx.writeBuffer()
}

export async function buildGroupedSummaryExcelBuffer(
  rows: GroupedSummaryRow[],
  options: { trackPrice: boolean },
) {
  const workbook = new ExcelJS.Workbook()
  writeGroupedSummarySheet(workbook, 'Përmbledhje', rows, options)
  return workbook.xlsx.writeBuffer()
}

export function formatExportTimestamp() {
  const now = new Date()
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function formatExportFilenameTimestamp() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`
}

export function permbledhjeExportFilename(groupBy: 'location' | 'product' | 'user') {
  const grouping =
    groupBy === 'location' ? 'Vendodhje' : groupBy === 'product' ? 'Produkti' : 'Perdoruesi'
  return `Permbledhje_${grouping}_${formatExportFilenameTimestamp()}.xlsx`
}

export type HistoryExportLocation = { key: string; emri: string }

export type HistoryExportSheetPlan = {
  kind: 'hyrje' | 'dalje' | 'transfer'
  locationKey: string | null
  title: string
}

export function resolveHistoryExportSheets(input: {
  lloji?: 'Hyrje' | 'Dalje' | 'Transfer'
  llojet?: ('Hyrje' | 'Dalje' | 'Transfer')[]
  locationKeys: string[]
  locations: HistoryExportLocation[]
}): HistoryExportSheetPlan[] {
  const { lloji, llojet, locationKeys, locations } = input
  const selectedLocations =
    locationKeys.length > 0
      ? locations.filter((loc) => locationKeys.includes(loc.key))
      : locations

  const activeLlojet: ('Hyrje' | 'Dalje' | 'Transfer')[] =
    llojet && llojet.length > 0 ? llojet : lloji ? [lloji] : ['Hyrje', 'Dalje', 'Transfer']

  const plans: HistoryExportSheetPlan[] = []
  for (const loc of selectedLocations) {
    if (activeLlojet.includes('Hyrje')) {
      plans.push({ kind: 'hyrje', locationKey: loc.key, title: `${loc.emri} Hyrje` })
    }
    if (activeLlojet.includes('Dalje')) {
      plans.push({ kind: 'dalje', locationKey: loc.key, title: `${loc.emri} Dalje` })
    }
  }
  if (activeLlojet.includes('Transfer')) {
    plans.push({ kind: 'transfer', locationKey: null, title: 'Transferta' })
  }
  return plans
}

function finalizeHistoryWorkbook(
  workbook: ExcelJS.Workbook,
  plans: HistoryExportSheetPlan[],
  navigation: {
    hyrjeRows: Map<string, NavSheetRow[]>
    daljeRows: Map<string, NavSheetRow[]>
    transferRows: NavSheetRow[]
  },
  transferLocationEmri?: string,
  options?: { includeEmptySheets?: boolean; includeCreator?: boolean },
) {
  const includeEmptySheets = options?.includeEmptySheets ?? false
  const includeCreator = options?.includeCreator ?? false
  const usedNames = new Set<string>(['Histori'])
  const sections = plans.map((plan) =>
    resolveHistoryExportSection(plan, navigation, transferLocationEmri, includeCreator),
  )
  const visibleSections = sections.filter(
    (section) => includeEmptySheets || section.rows.length > 0,
  )

  if (visibleSections.length > 0) {
    createHistoryCombinedSheet(workbook, visibleSections, includeCreator)
  }

  let sheetCount = visibleSections.length > 0 ? 1 : 0

  for (const section of visibleSections) {
    if (section.kind === 'transfer') {
      createListSheet(
        workbook,
        section.title,
        section.headers,
        section.rows,
        usedNames,
        section.priceCols,
        section.qtyCols,
        { includeCreator },
      )
      sheetCount += 1
      continue
    }

    createListSheet(
      workbook,
      section.title,
      section.headers,
      section.rows,
      usedNames,
      section.priceCols,
      section.qtyCols,
      { includeCreator },
    )
    sheetCount += 1
  }

  if (sheetCount === 0) {
    const sheet = workbook.addWorksheet('Histori')
    sheet.addRow([...veprimDetailHeaders(includeCreator)])
    sheet.addRow(['', ERR_NO_ACTIONS_IN_PERIOD])
    styleHeaderRow(sheet)
    applyBordersToDataRows(sheet, 2)
    autoSizeColumns(sheet, 120)
  }
}

export async function buildHistoryLegacyExcelBuffer(
  productRows: ProductExportRow[],
  actionRows: ActionExportRow[],
  allowedActionIds: Set<string>,
  plans: HistoryExportSheetPlan[],
  locations: HistoryExportLocation[],
  query: { from?: string; to?: string },
  transferLocationEmri?: string,
) {
  const locationCount = INVENTARI_LEGACY_LOCATION_COUNT
  const sortedActions = sortActionExportRows(actionRows)
  const productsByCode = new Map(productRows.map((p) => [p.kodi, p]))

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

  const navLocations = locations.length > 0 ? locations : [...LEGACY_NAV_LOCATIONS]
  const navigation = initNavRowBuckets(navLocations.map((loc) => loc.key))

  for (const action of sortedActions) {
    if (!allowedActionIds.has(action.id)) continue

    const product = productsByCode.get(action.kodi_produktit)
    const stock = runningStock.get(action.kodi_produktit)
    if (!product || !stock) continue

    const qty = signedQty(action)
    stock[action.shteti] += qty

    if (!isWithinExportRange(action, query)) continue
    if (isLegacyTransferDestinationRow(action)) continue

    const destinationShteti = legacyTransferDestination(action, sortedActions)
    const transferDestGjendje =
      destinationShteti && action.lloji === 'Dalje'
        ? stock[destinationShteti] + Number(action.sasia ?? 0)
        : undefined

    collectLegacyNavigationRow(
      navigation,
      navLocations,
      product,
      action,
      qty,
      action.shteti === 'XK' ? stock.XK : stock.AL,
      sortedActions,
      transferDestGjendje,
    )
  }

  const workbook = new ExcelJS.Workbook()
  finalizeHistoryWorkbook(workbook, plans, navigation, transferLocationEmri)
  return workbook.xlsx.writeBuffer()
}

export async function buildHistoryDynamicExcelBuffer(
  productRows: DynamicProductExportRow[],
  actionRows: DynamicActionExportRow[],
  locationIds: string[],
  locations: HistoryExportLocation[],
  allowedActionIds: Set<string>,
  plans: HistoryExportSheetPlan[],
  query: { from?: string; to?: string },
  transferLocationEmri?: string,
  includeEmptySheets?: boolean,
  exportConfig?: InventariExcelExportConfig,
) {
  const excelOptions = resolveInventariExcelExportOptions(exportConfig)
  const locationIndex = new Map(locationIds.map((id, index) => [id, index]))
  const sortedActions = sortDynamicActionExportRows(actionRows)
  const productsByCode = new Map(productRows.map((p) => [p.kodi, p]))

  const currentStock = new Map<string, Map<string, number>>()
  const runningStock = new Map<string, Map<string, number>>()

  for (const product of productRows) {
    const stock = new Map<string, number>()
    for (const locationId of locationIds) {
      stock.set(locationId, Number(product.stockByLocation.get(locationId) ?? 0))
    }
    currentStock.set(product.kodi, stock)
  }

  for (const action of sortedActions) {
    const stock = currentStock.get(action.kodi_produktit)
    const locationId = action.lokacioni_id
    if (!stock || !locationId) continue
    stock.set(locationId, (stock.get(locationId) ?? 0) - signedQty(action))
  }

  for (const [kodi, stock] of currentStock) {
    runningStock.set(kodi, new Map(stock))
  }

  const navLocations = locationIds.map((id, index) => ({
    key: id,
    emri: locations[index]?.emri ?? id,
  }))
  const navigation = initNavRowBuckets(locationIds)

  for (const action of sortedActions) {
    if (!allowedActionIds.has(action.id)) continue

    const product = productsByCode.get(action.kodi_produktit)
    const stock = runningStock.get(action.kodi_produktit)
    const locationId = action.lokacioni_id
    const blockIndex = locationId ? locationIndex.get(locationId) : undefined
    if (!product || !stock || !locationId || blockIndex === undefined) continue

    const qty = signedQty(action)
    const batch = resolveBatchMeta(action)
    stock.set(locationId, (stock.get(locationId) ?? 0) + qty)

    if (!isWithinExportRange(action, query)) continue
    if (isTransferDestinationRow(action)) continue

    collectDynamicNavigationRow(
      navigation,
      navLocations,
      locationIds,
      product,
      action,
      qty,
      stock.get(locationId) ?? 0,
      batch?.lloji === 'Transfer' &&
        action.lloji === 'Dalje' &&
        batch.destination_lokacioni_id
        ? (stock.get(batch.destination_lokacioni_id) ?? 0) + Number(action.sasia ?? 0)
        : undefined,
      exportConfig,
    )
  }

  const workbook = new ExcelJS.Workbook()
  finalizeHistoryWorkbook(workbook, plans, navigation, transferLocationEmri, {
    includeEmptySheets,
    includeCreator: excelOptions.includeCreator,
  })
  return workbook.xlsx.writeBuffer()
}
