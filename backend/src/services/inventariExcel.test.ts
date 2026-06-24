import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  accumulatePermbledhjeTotals,
  buildInventariExcelBuffer,
  buildPermbledhjeTotalRow,
  buildVeprimListTotalRow,
  configureInventariLocationHeaders,
  createInventariWorkbook,
  exportOraForAction,
  exportPershkrimiForAction,
  exportShenimForAction,
  inventariColumnCount,
  inventariSpacerCols,
  isWithinExportRange,
  locationBlockIndexForCol,
  locationBlockStartCol,
  signedQty,
  sortDynamicActionExportRows,
  sortActionExportRows,
  transferKey,
  writeInventariDataRow,
} from '../services/inventariExcel.js'

describe('inventariExcel helpers', () => {
  const row = {
    id: '1',
    lloji: 'Dalje' as const,
    data: '2026-06-10',
    shteti: 'XK' as const,
    kodi_produktit: 'P1',
    cmimi_njesi: 2,
    sasia: 5,
    created_at: '2026-06-10T10:00:00Z',
  }

  it('signedQty negates Dalje', () => {
    expect(signedQty(row)).toBe(-5)
  })

  it('transferKey is stable', () => {
    expect(transferKey(row)).toBe('2026-06-10|P1|2|5')
  })

  it('isWithinExportRange respects from/to', () => {
    expect(isWithinExportRange(row, { from: '2026-06-01', to: '2026-06-17' })).toBe(true)
    expect(isWithinExportRange(row, { from: '2026-06-15' })).toBe(false)
  })

  it('exportOraForAction returns batch ora when set', () => {
    expect(
      exportOraForAction({
        ...row,
        veprim_batch: { ora: '14:30:00', pershkrimi: null },
      }),
    ).toBe('14:30')
  })

  it('exportOraForAction returns empty when batch ora is missing', () => {
    expect(exportOraForAction(row)).toBe('')
  })

  it('exportPershkrimiForAction reads batch pershkrimi', () => {
    expect(
      exportPershkrimiForAction({
        ...row,
        veprim_batch: { ora: null, pershkrimi: '  Faturë  ' },
      }),
    ).toBe('Faturë')
  })

  it('exportShenimForAction trims line note', () => {
    expect(exportShenimForAction({ ...row, shenim: '  fragile  ' })).toBe('fragile')
  })

  it('inventariColumnCount grows by location block + spacer', () => {
    expect(inventariColumnCount(1)).toBe(10)
    expect(inventariColumnCount(2)).toBe(19)
    expect(inventariColumnCount(3)).toBe(28)
  })

  it('locationBlockStartCol follows template layout', () => {
    expect(locationBlockStartCol(0)).toBe(3)
    expect(locationBlockStartCol(1)).toBe(12)
    expect(locationBlockStartCol(2)).toBe(21)
  })

  it('inventariSpacerCols marks gaps between location blocks', () => {
    expect(inventariSpacerCols(3)).toEqual([11, 20])
    expect(inventariSpacerCols(4)).toEqual([11, 20, 29])
  })

  it('locationBlockIndexForCol maps columns to blocks', () => {
    expect(locationBlockIndexForCol(3, 3)).toBe(0)
    expect(locationBlockIndexForCol(12, 3)).toBe(1)
    expect(locationBlockIndexForCol(21, 3)).toBe(2)
    expect(locationBlockIndexForCol(11, 3)).toBeNull()
    expect(locationBlockIndexForCol(1, 3)).toBeNull()
  })

  it('sortDynamicActionExportRows keeps transfer Dalje before Hyrje', () => {
    const sorted = sortDynamicActionExportRows([
      {
        id: '2',
        lloji: 'Hyrje',
        data: '2026-06-10',
        lokacioni_id: 'dest',
        kodi_produktit: 'P1',
        cmimi_njesi: 2,
        sasia: 5,
        created_at: '2026-06-10T10:00:01Z',
        batch_id: 'batch-1',
        veprim_batch: {
          ora: null,
          pershkrimi: null,
          lloji: 'Transfer',
          lokacioni_id: 'src',
          destination_lokacioni_id: 'dest',
        },
      },
      {
        id: '1',
        lloji: 'Dalje',
        data: '2026-06-10',
        lokacioni_id: 'src',
        kodi_produktit: 'P1',
        cmimi_njesi: 2,
        sasia: 5,
        created_at: '2026-06-10T10:00:00Z',
        batch_id: 'batch-1',
        veprim_batch: {
          ora: null,
          pershkrimi: null,
          lloji: 'Transfer',
          lokacioni_id: 'src',
          destination_lokacioni_id: 'dest',
        },
      },
    ])

    expect(sorted.map((row) => row.id)).toEqual(['1', '2'])
  })

  it('sorts legacy transfer rows Dalje before destination Hyrje', () => {
    const sorted = sortActionExportRows([
      {
        id: '2',
        lloji: 'Hyrje',
        data: '2026-06-10',
        shteti: 'AL',
        kodi_produktit: 'P1',
        cmimi_njesi: 2,
        sasia: 5,
        created_at: '2026-06-10T10:00:01Z',
        batch_id: 'batch-1',
        veprim_batch: {
          ora: null,
          pershkrimi: null,
          lloji: 'Transfer',
          shteti: 'XK',
          destination_shteti: 'AL',
        },
      },
      {
        id: '1',
        lloji: 'Dalje',
        data: '2026-06-10',
        shteti: 'XK',
        kodi_produktit: 'P1',
        cmimi_njesi: 2,
        sasia: 5,
        created_at: '2026-06-10T10:00:00Z',
        batch_id: 'batch-1',
        veprim_batch: {
          ora: null,
          pershkrimi: null,
          lloji: 'Transfer',
          shteti: 'XK',
          destination_shteti: 'AL',
        },
      },
    ])

    expect(sorted.map((row) => row.id)).toEqual(['1', '2'])
  })

  it('buildPermbledhjeTotalRow writes TOTAL label and per-location sums', () => {
    const row = buildPermbledhjeTotalRow(
      [
        { sasi: -1, vlefta: 0 },
        { sasi: 2, vlefta: 150.5 },
      ],
      2,
    )
    expect(row[1]).toBe('TOTAL:')
    expect(row[6]).toBe(-1)
    expect(row[7]).toBe(0)
    expect(row[15]).toBe(2)
    expect(row[16]).toBe(150.5)
  })

  it('buildVeprimListTotalRow sums sasi and vlefta', () => {
    const total = buildVeprimListTotalRow([
      ['P1', 'Prod', '', '2026-06-10', '', 2, 5, 10, '', 15],
      ['P2', 'Other', '', '2026-06-11', '', 3, -2, -6, '', 8],
    ])
    expect(total?.[1]).toBe('TOTAL:')
    expect(total?.[6]).toBe(3)
    expect(total?.[7]).toBe(4)
  })

  it('accumulatePermbledhjeTotals adds block sasi and vlefta', () => {
    const totals = [
      { sasi: 0, vlefta: 0 },
      { sasi: 0, vlefta: 0 },
    ]
    const row = Array<string | number | null>(19).fill('')
    row[6] = -3
    row[7] = -12
    row[15] = 5
    row[16] = 40
    accumulatePermbledhjeTotals(totals, row, 2)
    expect(totals).toEqual([
      { sasi: -3, vlefta: -12 },
      { sasi: 5, vlefta: 40 },
    ])
  })

  it('createInventariWorkbook builds export without template file', async () => {
    const { sheet } = await createInventariWorkbook(2)
    configureInventariLocationHeaders(sheet, [{ emri: 'Kosova' }, { emri: 'Shqiperi' }])
    const row = Array(inventariColumnCount(2)).fill('')
    for (let rowNumber = 3; rowNumber <= 30; rowNumber += 1) {
      writeInventariDataRow(sheet, rowNumber, row, 2)
    }
    expect(sheet.getCell(3, 3).fill?.fgColor?.argb).toBe('FFC9DAF8')
    expect(sheet.getCell(3, 12).fill?.fgColor?.argb).toBe('FFFCE5CD')
  })

  it('buildInventariExcelBuffer keeps location block colors after total row', async () => {
    const buffer = await buildInventariExcelBuffer(
      [
        {
          kodi: 'P1',
          emri: 'Produkt',
          gjendje_kosove: 10,
          gjendje_shqiperi: 0,
        },
      ],
      [
        {
          id: '1',
          lloji: 'Hyrje',
          data: '2026-06-10',
          shteti: 'XK',
          kodi_produktit: 'P1',
          cmimi_njesi: 2,
          sasia: 5,
          created_at: '2026-06-10T10:00:00Z',
        },
      ],
      {},
    )

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Permbledhje')
    expect(sheet).toBeTruthy()
    expect(sheet!.getCell(3, 3).fill?.fgColor?.argb).toBe('FFC9DAF8')
    expect(sheet!.getCell(3, 12).fill?.fgColor?.argb).toBe('FFFCE5CD')
    expect(sheet!.getCell(4, 2).value).toBe('TOTAL:')
    expect(sheet!.getCell(3, 5).value).toBe('')

    const hyrjeSheet = workbook.getWorksheet('Kosova Hyrje')
    expect(hyrjeSheet).toBeTruthy()
    expect(hyrjeSheet!.lastRow?.number).toBe(3)
    expect(hyrjeSheet!.getCell(3, 2).value).toBe('TOTAL:')
    expect(hyrjeSheet!.getCell(3, 7).value).toBe(5)
    expect(hyrjeSheet!.getCell(3, 8).value).toBe(10)
  })
})
