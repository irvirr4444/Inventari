import { describe, expect, it } from 'vitest'
import {
  EMPTY_CLIENT_FILTERS,
  getHistoryFilterRangeIssues,
  HISTORY_FILTER_RANGE_MESSAGES,
} from './historyClientFilters'

describe('getHistoryFilterRangeIssues', () => {
  it('flags inverted date range', () => {
    const issues = getHistoryFilterRangeIssues(
      { dateFrom: '2026-06-20', dateTo: '2026-06-01' },
      EMPTY_CLIENT_FILTERS,
    )
    expect(issues).toEqual([{ field: 'date', message: HISTORY_FILTER_RANGE_MESSAGES.date }])
  })

  it('flags inverted ora range', () => {
    const issues = getHistoryFilterRangeIssues(
      {},
      { ...EMPTY_CLIENT_FILTERS, oraFrom: '18:00', oraDeri: '09:00' },
    )
    expect(issues).toEqual([{ field: 'ora', message: HISTORY_FILTER_RANGE_MESSAGES.ora }])
  })

  it('flags inverted totali and produkte ranges', () => {
    const issues = getHistoryFilterRangeIssues(
      {},
      {
        ...EMPTY_CLIENT_FILTERS,
        totaliMin: 200,
        totaliMax: 50,
        produkteMin: 5,
        produkteMax: 2,
      },
    )
    expect(issues.map((issue) => issue.field)).toEqual(['totali', 'produkte'])
  })

  it('allows partial bounds', () => {
    expect(
      getHistoryFilterRangeIssues({ dateFrom: '2026-06-01' }, EMPTY_CLIENT_FILTERS),
    ).toEqual([])
  })
})
