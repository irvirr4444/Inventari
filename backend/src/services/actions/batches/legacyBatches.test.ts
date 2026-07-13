import { describe, expect, it } from 'vitest'
import {
  decodeLegacyBatchId,
  encodeLegacyBatchId,
  groupLegacyVeprimRows,
  isLegacyBatchId,
  type VeprimRow,
} from './legacyBatches.js'

function row(partial: Partial<VeprimRow> & Pick<VeprimRow, 'id'>): VeprimRow {
  return {
    batch_id: null,
    lloji: 'Hyrje',
    data: '2026-06-17',
    shteti: 'XK',
    kodi_produktit: 'P1',
    cmimi_njesi: 1,
    sasia: 2,
    totali: 2,
    created_at: '2026-06-17T10:00:00Z',
    ...partial,
  }
}

describe('legacy batch ids', () => {
  it('encodes and decodes legacy ids', () => {
    const key = {
      data: '2026-06-17',
      bucketSecond: '2026-06-17T10:00:00',
      lloji: 'Hyrje' as const,
      shteti: 'XK' as const,
    }
    const id = encodeLegacyBatchId(key)
    expect(isLegacyBatchId(id)).toBe(true)
    expect(decodeLegacyBatchId(id)).toEqual(key)
  })
})

describe('groupLegacyVeprimRows', () => {
  it('groups rows by bucket and transfer route', () => {
    const rows: VeprimRow[] = [
      row({ id: '1', lloji: 'Dalje', shteti: 'XK', created_at: '2026-06-17T10:00:00Z' }),
      row({ id: '2', lloji: 'Hyrje', shteti: 'AL', created_at: '2026-06-17T10:00:00Z' }),
    ]

    const batches = groupLegacyVeprimRows(rows)
    expect(batches.length).toBeGreaterThan(0)
    expect(batches[0].rows.length).toBe(2)
  })
})
