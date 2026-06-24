import { describe, expect, it } from 'vitest'
import {
  exportOraForAction,
  exportPershkrimiForAction,
  exportShenimForAction,
  isWithinExportRange,
  signedQty,
  transferKey,
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

  it('exportOraForAction prefers batch ora', () => {
    expect(
      exportOraForAction({
        ...row,
        veprim_batch: { ora: '14:30:00', pershkrimi: null },
      }),
    ).toBe('14:30')
  })

  it('exportOraForAction falls back to created_at', () => {
    expect(exportOraForAction(row)).toBe('10:00')
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
})
