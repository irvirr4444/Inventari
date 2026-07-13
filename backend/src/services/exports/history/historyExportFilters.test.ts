import { describe, expect, it } from 'vitest'
import {
  applyHistoryExportClientFilters,
  assertHistoryExportFilterRanges,
  HISTORY_EXPORT_RANGE_MESSAGES,
  type HistoryExportBatch,
} from './index.js'

const batch = (partial: Partial<HistoryExportBatch>): HistoryExportBatch => ({
  id: 'b1',
  lloji: 'Hyrje',
  shteti: 'XK',
  data: '2026-06-10',
  ora: '10:00',
  pershkrimi: 'Faturë',
  totali: 100,
  item_count: 2,
  created_at: '2026-06-10T10:00:00Z',
  lokacioni_id: 'loc-1',
  ...partial,
})

describe('assertHistoryExportFilterRanges', () => {
  it('rejects inverted date range', () => {
    expect(() =>
      assertHistoryExportFilterRanges({ dateFrom: '2026-06-20', dateTo: '2026-06-01' }),
    ).toThrow(HISTORY_EXPORT_RANGE_MESSAGES.date)
  })
})

describe('applyHistoryExportClientFilters', () => {
  it('filters by location including transfer destination', () => {
    const rows = [
      batch({ id: '1', lokacioni_id: 'loc-1' }),
      batch({
        id: '2',
        lloji: 'Transfer',
        lokacioni_id: 'loc-1',
        destination_lokacioni_id: 'loc-2',
      }),
      batch({
        id: '3',
        lloji: 'Transfer',
        lokacioni_id: 'loc-2',
        destination_lokacioni_id: 'loc-1',
      }),
      batch({ id: '4', lokacioni_id: 'loc-2' }),
    ]

    expect(
      applyHistoryExportClientFilters(rows, { locationIds: ['loc-1'] }).map((row) => row.id),
    ).toEqual(['1', '2', '3'])

    expect(
      applyHistoryExportClientFilters(rows, { locationIds: ['loc-1', 'loc-2'] }).map(
        (row) => row.id,
      ),
    ).toEqual(['1', '2', '3', '4'])
  })

  it('filters by ora, totali, produkte, and pershkrimi', () => {
    const rows = [
      batch({ id: '1', ora: '08:00', totali: 50, item_count: 2, pershkrimi: 'Alpha' }),
      batch({ id: '2', ora: '14:00', totali: 200, item_count: 5, pershkrimi: 'Beta' }),
      batch({ id: '3', ora: '10:00', totali: 100, item_count: 3, pershkrimi: 'Invoice' }),
    ]

    expect(
      applyHistoryExportClientFilters(rows, { oraFrom: '09:00', oraDeri: '12:00' }).map(
        (row) => row.id,
      ),
    ).toEqual(['3'])
    expect(
      applyHistoryExportClientFilters(rows, { totaliMin: 80, totaliMax: 150 }).map((row) => row.id),
    ).toEqual(['3'])
    expect(applyHistoryExportClientFilters(rows, { produkteMin: 4 }).map((row) => row.id)).toEqual([
      '2',
    ])
    expect(
      applyHistoryExportClientFilters(rows, { pershkrimi: 'invoice' }).map((row) => row.id),
    ).toEqual(['3'])
  })
})
