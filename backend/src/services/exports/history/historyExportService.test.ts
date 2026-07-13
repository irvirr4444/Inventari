import { describe, expect, it } from 'vitest'
import { buildHistoryLegacyExcelBuffer } from '../excel/index.js'

describe('history export product filter', () => {
  it('exports only rows for the selected product code', async () => {
    const locations = [
      { key: 'XK', emri: 'Kosova' },
      { key: 'AL', emri: 'Shqiperi' },
    ]
    const actions = [
      {
        id: 'row-p1',
        lloji: 'Hyrje' as const,
        data: '2026-06-10',
        shteti: 'XK' as const,
        kodi_produktit: 'P1',
        cmimi_njesi: 2,
        sasia: 5,
        created_at: '2026-06-10T10:00:00Z',
      },
      {
        id: 'row-p2',
        lloji: 'Hyrje' as const,
        data: '2026-06-10',
        shteti: 'XK' as const,
        kodi_produktit: 'P2',
        cmimi_njesi: 3,
        sasia: 4,
        created_at: '2026-06-10T10:00:00Z',
      },
    ]

    const buffer = await buildHistoryLegacyExcelBuffer(
      [
        { kodi: 'P1', emri: 'Alpha', gjendje_kosove: 5, gjendje_shqiperi: 0 },
        { kodi: 'P2', emri: 'Beta', gjendje_kosove: 4, gjendje_shqiperi: 0 },
      ],
      actions,
      new Set(['row-p1']),
      [{ kind: 'hyrje' as const, locationKey: 'XK', title: 'Kosova Hyrje' }],
      locations,
      { from: '2026-06-01', to: '2026-06-30' },
    )

    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const combined = workbook.getWorksheet('Histori')
    expect(combined?.getCell(3, 1).value).toBe('P1')
    expect(combined?.getCell(4, 1).value).not.toBe('P2')
  })
})
