import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { buildGroupedSummaryExcelBuffer } from './inventariExcel.js'

describe('buildGroupedSummaryExcelBuffer', () => {
  it('writes quantity-only columns when track_price is false', async () => {
    const buffer = await buildGroupedSummaryExcelBuffer(
      [
        {
          id: 'p1',
          label: 'Alpha (A1)',
          in_qty: 4,
          in_value: 40,
          out_qty: 1,
          out_value: 10,
        },
      ],
      { trackPrice: false },
    )

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Përmbledhje')
    expect(sheet).toBeTruthy()
    expect(sheet!.getRow(1).values).toEqual(
      expect.arrayContaining(['Grupi', 'Hyrje (sasi)', 'Dalje (sasi)', 'Neto (sasi)']),
    )
    expect(sheet!.getRow(2).getCell(1).value).toBe('Alpha (A1)')
    expect(sheet!.getRow(2).getCell(2).value).toBe(4)
    expect(sheet!.getRow(2).getCell(3).value).toBe(1)
    expect(sheet!.getRow(2).getCell(4).value).toBe(3)
  })

  it('writes value columns when track_price is true', async () => {
    const buffer = await buildGroupedSummaryExcelBuffer(
      [
        {
          id: 'u1',
          label: 'Arben',
          in_qty: 2,
          in_value: 20,
          out_qty: 1,
          out_value: 10,
        },
      ],
      { trackPrice: true },
    )

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Përmbledhje')
    expect(sheet!.getRow(1).values).toEqual(
      expect.arrayContaining([
        'Grupi',
        'Hyrje (sasi)',
        'Hyrje (vlera)',
        'Dalje (sasi)',
        'Dalje (vlera)',
        'Neto (sasi)',
        'Neto (vlera)',
      ]),
    )
  })
})
