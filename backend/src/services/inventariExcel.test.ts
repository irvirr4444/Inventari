import { describe, expect, it } from 'vitest'
import {
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
})
