import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  buildDynamicInventariExcelBuffer,
  GROUPED_DETAIL_SHEET_CAP,
  planGroupedDetailSheets,
  sanitizeExcelSheetName,
} from './inventariExcel.js'
import {
  buildProductGroupedInventariExcelBuffer,
  buildUserGroupedInventariExcelBuffer,
} from './groupedInventariExcel.js'

const locations = [{ emri: 'Depo A' }, { emri: 'Depo B' }]
const locationIds = ['loc-a', 'loc-b']

const products = [
  {
    kodi: 'P1',
    emri: 'Alpha',
    stockByLocation: new Map([
      ['loc-a', 10],
      ['loc-b', 0],
    ]),
  },
  {
    kodi: 'P2',
    emri: 'Beta',
    stockByLocation: new Map([
      ['loc-a', 0],
      ['loc-b', 5],
    ]),
  },
]

const actions = [
  {
    id: 'a1',
    lloji: 'Hyrje' as const,
    data: '2026-06-10',
    lokacioni_id: 'loc-a',
    kodi_produktit: 'P1',
    cmimi_njesi: 2,
    sasia: 5,
    created_at: '2026-06-10T10:00:00Z',
    batch_id: 'batch-1',
    veprim_batch: {
      ora: null,
      pershkrimi: 'Furnizim',
      lloji: 'Hyrje',
      lokacioni_id: 'loc-a',
      created_by_user_id: 'user-1',
    },
  },
  {
    id: 'a2',
    lloji: 'Dalje' as const,
    data: '2026-06-11',
    lokacioni_id: 'loc-a',
    kodi_produktit: 'P1',
    cmimi_njesi: 2,
    sasia: 2,
    created_at: '2026-06-11T10:00:00Z',
    batch_id: 'batch-2',
    veprim_batch: {
      ora: null,
      pershkrimi: 'Shitje',
      lloji: 'Dalje',
      lokacioni_id: 'loc-a',
      created_by_user_id: 'user-2',
    },
  },
  {
    id: 'a3',
    lloji: 'Dalje' as const,
    data: '2026-06-12',
    lokacioni_id: 'loc-a',
    kodi_produktit: 'P2',
    cmimi_njesi: 3,
    sasia: 4,
    created_at: '2026-06-12T10:00:00Z',
    batch_id: 'batch-3',
    veprim_batch: {
      ora: null,
      pershkrimi: 'Transferim',
      lloji: 'Transfer',
      lokacioni_id: 'loc-a',
      destination_lokacioni_id: 'loc-b',
      created_by_user_id: 'user-1',
    },
  },
  {
    id: 'a4',
    lloji: 'Hyrje' as const,
    data: '2026-06-12',
    lokacioni_id: 'loc-b',
    kodi_produktit: 'P2',
    cmimi_njesi: 3,
    sasia: 4,
    created_at: '2026-06-12T10:00:01Z',
    batch_id: 'batch-3',
    veprim_batch: {
      ora: null,
      pershkrimi: 'Transferim',
      lloji: 'Transfer',
      lokacioni_id: 'loc-a',
      destination_lokacioni_id: 'loc-b',
      created_by_user_id: 'user-1',
    },
  },
]

const groupedProductRows = [
  {
    id: 'P1',
    label: 'Alpha (P1)',
    in_qty: 5,
    in_value: 10,
    out_qty: 2,
    out_value: 4,
  },
  {
    id: 'P2',
    label: 'Beta (P2)',
    in_qty: 4,
    in_value: 12,
    out_qty: 4,
    out_value: 12,
  },
]

const groupedUserRows = [
  {
    id: 'user-1',
    label: 'Arben',
    in_qty: 9,
    in_value: 22,
    out_qty: 4,
    out_value: 12,
  },
  {
    id: 'user-2',
    label: 'Drita',
    in_qty: 0,
    in_value: 0,
    out_qty: 2,
    out_value: 4,
  },
]

const query = { from: '2026-06-01', to: '2026-06-30' }

const creatorTestContext = {
  resolveCreator: (action: (typeof actions)[number]) =>
    (Array.isArray(action.veprim_batch)
      ? action.veprim_batch[0]?.created_by_user_id
      : action.veprim_batch?.created_by_user_id) ?? 'owner-1',
  creatorLabelById: new Map([
    ['user-1', 'Arben'],
    ['user-2', 'Drita'],
  ]),
}

const excelExportWithCreator = {
  includeCreator: true,
  creator: {
    creatorLabelById: creatorTestContext.creatorLabelById,
    accountOwnerId: 'owner-1',
  },
}

async function sheetNames(buffer: ExcelJS.Buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  return workbook.worksheets.map((sheet) => sheet.name)
}

async function mainSheetSnapshot(buffer: ExcelJS.Buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet('Përmbledhje')
  expect(sheet).toBeTruthy()
  const rows: unknown[][] = []
  sheet!.eachRow({ includeEmpty: true }, (row) => {
    rows.push(
      Array.from({ length: sheet!.columnCount }, (_, index) => row.getCell(index + 1).value),
    )
  })
  return rows
}

describe('groupedInventariExcel', () => {
  it('keeps location export main sheet identical after refactor', async () => {
    const locationBuffer = await buildDynamicInventariExcelBuffer(
      products,
      actions,
      locations,
      locationIds,
      query,
    )
    const productBuffer = await buildProductGroupedInventariExcelBuffer({
      productRows: products,
      actionRows: actions,
      locations,
      locationIds,
      query,
      groupedRows: groupedProductRows,
      trackPrice: true,
      accountOwnerId: 'owner-1',
      locationNameById: new Map([
        ['loc-a', 'Depo A'],
        ['loc-b', 'Depo B'],
      ]),
      ...creatorTestContext,
    })

    const locationMain = await mainSheetSnapshot(locationBuffer)
    const productMain = await mainSheetSnapshot(productBuffer)
    expect(productMain).toEqual(locationMain)
  })

  it('writes Perdoruesi on location export detail sheets when enabled', async () => {
    const buffer = await buildDynamicInventariExcelBuffer(
      products,
      actions,
      locations,
      locationIds,
      query,
      excelExportWithCreator,
    )

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const hyrje = workbook.getWorksheet('Depo A Hyrje')
    expect(hyrje?.getRow(1).getCell(3).value).toBe('Perdoruesi')
    expect(hyrje?.getRow(2).getCell(3).value).toBe('Arben')

    const dalje = workbook.getWorksheet('Depo A Dalje')
    expect(dalje?.getRow(2).getCell(3).value).toBe('Drita')
  })

  it('writes expected sheets for product grouping', async () => {
    const buffer = await buildProductGroupedInventariExcelBuffer({
      productRows: products,
      actionRows: actions,
      locations,
      locationIds,
      query,
      groupedRows: groupedProductRows,
      trackPrice: true,
      accountOwnerId: 'owner-1',
      locationNameById: new Map([
        ['loc-a', 'Depo A'],
        ['loc-b', 'Depo B'],
      ]),
      ...creatorTestContext,
    })

    const names = await sheetNames(buffer)
    expect(names[0]).toBe('Përmbledhje')
    expect(names).toContain('Sipas Produktit')
    expect(names).toContain('Alpha (P1) Hyrje')
    expect(names).toContain('Alpha (P1) Dalje')
    expect(names).toContain('Beta (P2) Hyrje')
    expect(names).toContain('Beta (P2) Dalje')
    expect(names).toContain('Transfer')
    expect(names).not.toContain('Depo A Hyrje')
  })

  it('writes expected sheets for user grouping with creator on transfer when enabled', async () => {
    const buffer = await buildUserGroupedInventariExcelBuffer({
      productRows: products,
      actionRows: actions,
      locations,
      locationIds,
      query,
      groupedRows: groupedUserRows,
      trackPrice: true,
      accountOwnerId: 'owner-1',
      locationNameById: new Map([
        ['loc-a', 'Depo A'],
        ['loc-b', 'Depo B'],
      ]),
      resolveCreator: creatorTestContext.resolveCreator,
      creatorLabelById: creatorTestContext.creatorLabelById,
      excelExport: excelExportWithCreator,
    })

    const names = await sheetNames(buffer)
    expect(names[0]).toBe('Përmbledhje')
    expect(names).toContain('Sipas Perdoruesit')
    expect(names).toContain('Arben Hyrje')
    expect(names).toContain('Arben Dalje')
    expect(names).toContain('Drita Dalje')
    expect(names).toContain('Drita Hyrje')

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const transfer = workbook.getWorksheet('Transfer')
    expect(transfer?.getRow(1).values).toEqual(
      expect.arrayContaining(['Krijuar nga', 'Nga', 'Te', 'Kodi', 'Produkti']),
    )
    expect(transfer?.getRow(2).getCell(1).value).toBe('Arben')
  })

  it('writes Perdoruesi on product transfer sheet when enabled', async () => {
    const buffer = await buildProductGroupedInventariExcelBuffer({
      productRows: products,
      actionRows: actions,
      locations,
      locationIds,
      query,
      groupedRows: groupedProductRows,
      trackPrice: true,
      accountOwnerId: 'owner-1',
      locationNameById: new Map([
        ['loc-a', 'Depo A'],
        ['loc-b', 'Depo B'],
      ]),
      ...creatorTestContext,
      excelExport: excelExportWithCreator,
    })

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const transfer = workbook.getWorksheet('Transfer')
    expect(transfer?.getRow(1).getCell(1).value).toBe('Krijuar nga')
    expect(transfer?.getRow(2).getCell(1).value).toBe('Arben')
  })

  it('writes action meta on product detail sheets', async () => {
    const buffer = await buildProductGroupedInventariExcelBuffer({
      productRows: products,
      actionRows: actions,
      locations,
      locationIds,
      query,
      groupedRows: groupedProductRows,
      trackPrice: true,
      accountOwnerId: 'owner-1',
      locationNameById: new Map([
        ['loc-a', 'Depo A'],
        ['loc-b', 'Depo B'],
      ]),
      ...creatorTestContext,
    })

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const detail = workbook.getWorksheet('Alpha (P1) Hyrje')
    expect(detail?.getRow(1).values).toEqual(
      expect.arrayContaining([
        'Përshkrimi',
        'Data',
        'Ora',
        'Vendndodhja',
        'Cmimi/Njësi',
        'Sasi',
        'Vlefta',
        'Shënim për produktin',
      ]),
    )
    expect(detail?.getRow(2).getCell(1).value).toBe('Furnizim')
    expect(detail?.getRow(2).getCell(2).value).toBe('2026-06-10')
    expect(detail?.getRow(2).getCell(4).value).toBe('Depo A')
    expect(detail?.getRow(2).getCell(6).value).toBe(5)
  })

  it('writes Perdoruesi on product detail sheets when enabled', async () => {
    const buffer = await buildProductGroupedInventariExcelBuffer({
      productRows: products,
      actionRows: actions,
      locations,
      locationIds,
      query,
      groupedRows: groupedProductRows,
      trackPrice: true,
      accountOwnerId: 'owner-1',
      locationNameById: new Map([
        ['loc-a', 'Depo A'],
        ['loc-b', 'Depo B'],
      ]),
      ...creatorTestContext,
      excelExport: excelExportWithCreator,
    })

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const detail = workbook.getWorksheet('Alpha (P1) Hyrje')
    expect(detail?.getRow(1).getCell(5).value).toBe('Perdoruesi')
    expect(detail?.getRow(2).getCell(5).value).toBe('Arben')
  })

  it('hides price columns when track_price is false', async () => {
    const buffer = await buildProductGroupedInventariExcelBuffer({
      productRows: products,
      actionRows: actions,
      locations,
      locationIds,
      query,
      groupedRows: groupedProductRows,
      trackPrice: false,
      accountOwnerId: 'owner-1',
      locationNameById: new Map([
        ['loc-a', 'Depo A'],
        ['loc-b', 'Depo B'],
      ]),
      ...creatorTestContext,
    })

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const summary = workbook.getWorksheet('Sipas Produktit')
    expect(summary?.getRow(1).values).toEqual(
      expect.arrayContaining(['Grupi', 'Hyrje (sasi)', 'Dalje (sasi)', 'Neto (sasi)']),
    )
    expect(summary?.getRow(1).values).not.toEqual(expect.arrayContaining(['Hyrje (vlera)']))

    const detail = workbook.getWorksheet('Alpha (P1) Hyrje')
    expect(detail?.getRow(1).values).toEqual(
      expect.arrayContaining([
        'Përshkrimi',
        'Data',
        'Ora',
        'Vendndodhja',
        'Sasi',
        'Shënim për produktin',
      ]),
    )
    expect(detail?.getRow(1).values).not.toEqual(expect.arrayContaining(['Cmimi/Njësi']))
    expect(detail?.getRow(2).getCell(1).value).toBe('Furnizim')
    expect(detail?.getRow(2).getCell(2).value).toBe('2026-06-10')
    expect(detail?.getRow(2).getCell(5).value).toBe(5)
    expect(detail?.getRow(2).values).toHaveLength(7)
  })

  it('sanitizes and dedupes long sheet names', () => {
    const used = new Set<string>()
    const first = sanitizeExcelSheetName('Very long product name that exceeds excel limit', used)
    const second = sanitizeExcelSheetName('Very long product name that exceeds excel limit', used)
    expect(first.length).toBeLessThanOrEqual(31)
    expect(second).not.toBe(first)
    expect(used.has(first)).toBe(true)
    expect(used.has(second)).toBe(true)
  })

  it('rolls overflow groups into Të tjerë sheets', () => {
    const rows = Array.from({ length: GROUPED_DETAIL_SHEET_CAP + 3 }, (_, index) => ({
      id: `p${index}`,
      label: `Product ${index}`,
      in_qty: 10 - index,
      in_value: 10,
      out_qty: 1,
      out_value: 1,
    }))
    const plan = planGroupedDetailSheets(rows)
    expect(plan.featured).toHaveLength(GROUPED_DETAIL_SHEET_CAP)
    expect(plan.remainder).toHaveLength(3)
    expect(plan.note).toContain('Të tjerë')
  })

  it('excludes groups with zero actions from grouped summary rows input', async () => {
    const buffer = await buildProductGroupedInventariExcelBuffer({
      productRows: products,
      actionRows: actions,
      locations,
      locationIds,
      query,
      groupedRows: groupedProductRows,
      trackPrice: true,
      accountOwnerId: 'owner-1',
      locationNameById: new Map([
        ['loc-a', 'Depo A'],
        ['loc-b', 'Depo B'],
      ]),
      ...creatorTestContext,
    })

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const summary = workbook.getWorksheet('Sipas Produktit')
    const labels: string[] = []
    summary?.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return
      const value = row.getCell(1).value
      if (value && value !== 'TOTAL:') labels.push(String(value))
    })
    expect(labels).toEqual(['Alpha (P1)', 'Beta (P2)'])
    expect(labels).not.toContain('Gamma (P3)')
  })
})
