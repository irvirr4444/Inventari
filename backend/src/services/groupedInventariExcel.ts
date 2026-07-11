import type { GroupedSummaryRow } from '@inventari/shared'
import {
  type DynamicActionExportRow,
  type DynamicProductExportRow,
  type InventariLocationHeader,
  collectProductGroupedDetailRows,
  collectUserGroupedDetailRows,
  exportOraForAction,
  exportPershkrimiForAction,
  exportShenimForAction,
  finalizeMainPermbledhjeSheet,
  planGroupedDetailSheets,
  prepareDynamicInventariWorkbook,
  sortDynamicActionExportRows,
  writeGroupedEntityDetailSheets,
  writeGroupedSummarySheet,
  writeTransferListSheet,
  workbookUsedSheetNames,
  isWithinExportRange,
  type NavSheetRow,
  inventariExcelIncludesCreator,
  type InventariExcelExportConfig,
} from './inventariExcel.js'

function collectUserTransferRows(
  actions: DynamicActionExportRow[],
  productsByCode: Map<string, { kodi: string; emri: string }>,
  locationNameById: Map<string, string>,
  creatorLabelById: Map<string, string>,
  resolveCreator: (action: DynamicActionExportRow) => string,
  query: { from?: string; to?: string },
  trackPrice: boolean,
  includeCreator: boolean,
): NavSheetRow[] {
  const rows: NavSheetRow[] = []

  for (const action of sortDynamicActionExportRows(actions)) {
    if (!isWithinExportRange(action, query)) continue
    const batch = Array.isArray(action.veprim_batch)
      ? action.veprim_batch[0]
      : action.veprim_batch
    if (batch?.lloji !== 'Transfer' || action.lloji !== 'Dalje' || !batch.destination_lokacioni_id) {
      continue
    }
    const product = productsByCode.get(action.kodi_produktit)
    if (!product || !action.lokacioni_id) continue

    const creatorId = includeCreator ? resolveCreator(action) : ''
    const creatorLabel = includeCreator ? (creatorLabelById.get(creatorId) ?? creatorId) : ''
    const fromLabel = locationNameById.get(action.lokacioni_id) ?? ''
    const toLabel = locationNameById.get(batch.destination_lokacioni_id) ?? ''
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
      trackPrice ? unitPrice : null,
      qty,
      trackPrice ? unitPrice * qty : null,
      exportShenimForAction(action),
    ]
    if (includeCreator) {
      row.unshift(creatorLabel)
    }
    rows.push(row)
  }

  return rows
}

async function buildGroupedInventariExcelBuffer(input: {
  mode: 'product' | 'user'
  summarySheetTitle: string
  productRows: DynamicProductExportRow[]
  actionRows: DynamicActionExportRow[]
  locations: InventariLocationHeader[]
  locationIds: string[]
  query: { from?: string; to?: string }
  groupedRows: GroupedSummaryRow[]
  trackPrice: boolean
  accountOwnerId: string
  locationNameById: Map<string, string>
  resolveCreator: (action: DynamicActionExportRow) => string
  creatorLabelById: Map<string, string>
  excelExport?: InventariExcelExportConfig
}) {
  const includeCreator = inventariExcelIncludesCreator(input.excelExport)
  const prepared = await prepareDynamicInventariWorkbook(
    input.productRows,
    input.actionRows,
    input.locations,
    input.locationIds,
    input.query,
  )

  finalizeMainPermbledhjeSheet(prepared.mainSheet, prepared.locationCount)
  const usedNames = workbookUsedSheetNames(prepared.workbook)
  const { featured, remainder, note } = planGroupedDetailSheets(input.groupedRows)

  writeGroupedSummarySheet(prepared.workbook, input.summarySheetTitle, input.groupedRows, {
    trackPrice: input.trackPrice,
    note,
    usedNames,
  })

  if (input.mode === 'product') {
    const detailRows = collectProductGroupedDetailRows(
      input.actionRows,
      prepared.productsByCode,
      input.locationNameById,
      input.creatorLabelById,
      input.accountOwnerId,
      input.resolveCreator,
      input.query,
      input.trackPrice,
      includeCreator,
    )
    writeGroupedEntityDetailSheets({
      workbook: prepared.workbook,
      usedNames,
      featured: featured.map((row) => ({
        key: row.id,
        label: row.label,
        activity: row.in_qty + row.out_qty,
      })),
      remainder: remainder.map((row) => ({
        key: row.id,
        label: row.label,
        activity: row.in_qty + row.out_qty,
      })),
      hyrjeRows: detailRows.hyrjeRows,
      daljeRows: detailRows.daljeRows,
      mode: 'product',
      trackPrice: input.trackPrice,
      includeCreator,
    })
    const transferRows = collectUserTransferRows(
      input.actionRows,
      prepared.productsByCode,
      input.locationNameById,
      input.creatorLabelById,
      input.resolveCreator,
      input.query,
      input.trackPrice,
      includeCreator,
    )
    writeTransferListSheet(prepared.workbook, transferRows, usedNames, {
      trackPrice: input.trackPrice,
      includeCreator,
    })
  } else {
    const detailRows = collectUserGroupedDetailRows(
      input.actionRows,
      prepared.productsByCode,
      input.locationNameById,
      input.creatorLabelById,
      input.accountOwnerId,
      input.resolveCreator,
      input.query,
      input.trackPrice,
      includeCreator,
    )
    writeGroupedEntityDetailSheets({
      workbook: prepared.workbook,
      usedNames,
      featured: featured.map((row) => ({
        key: row.id,
        label: row.label,
        activity: row.in_qty + row.out_qty,
      })),
      remainder: remainder.map((row) => ({
        key: row.id,
        label: row.label,
        activity: row.in_qty + row.out_qty,
      })),
      hyrjeRows: detailRows.hyrjeRows,
      daljeRows: detailRows.daljeRows,
      mode: 'user',
      trackPrice: input.trackPrice,
      includeCreator,
    })
    const transferRows = collectUserTransferRows(
      input.actionRows,
      prepared.productsByCode,
      input.locationNameById,
      input.creatorLabelById,
      input.resolveCreator,
      input.query,
      input.trackPrice,
      includeCreator,
    )
    writeTransferListSheet(prepared.workbook, transferRows, usedNames, {
      trackPrice: input.trackPrice,
      includeCreator,
    })
  }

  return prepared.workbook.xlsx.writeBuffer()
}

export async function buildProductGroupedInventariExcelBuffer(
  input: Omit<Parameters<typeof buildGroupedInventariExcelBuffer>[0], 'mode' | 'summarySheetTitle'>,
) {
  return buildGroupedInventariExcelBuffer({
    ...input,
    mode: 'product',
    summarySheetTitle: 'Sipas Produktit',
  })
}

export async function buildUserGroupedInventariExcelBuffer(
  input: Omit<Parameters<typeof buildGroupedInventariExcelBuffer>[0], 'mode' | 'summarySheetTitle'>,
) {
  return buildGroupedInventariExcelBuffer({
    ...input,
    mode: 'user',
    summarySheetTitle: 'Sipas Perdoruesit',
  })
}
