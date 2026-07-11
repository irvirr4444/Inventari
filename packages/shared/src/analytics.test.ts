import { describe, expect, it } from 'vitest'
import {
  buildGroupedSummaryRows,
  buildSummaryByCountry,
  buildSummaryByLocation,
  buildSummaryByProduct,
  buildSummaryByUser,
} from './analytics.js'
import { productLabel } from './format.js'

describe('productLabel', () => {
  it('combines name and code', () => {
    expect(productLabel('Widget', 'W1')).toBe('Widget (W1)')
  })

  it('returns code only when name empty', () => {
    expect(productLabel('', 'W1')).toBe('W1')
  })
})

describe('buildSummaryByCountry', () => {
  it('aggregates Hyrje and Dalje per country including transfer legs', () => {
    const summary = buildSummaryByCountry([
      { lloji: 'Hyrje', shteti: 'XK', sasia: 10, totali: 100 },
      { lloji: 'Dalje', shteti: 'XK', sasia: 3, totali: 30 },
      { lloji: 'Hyrje', shteti: 'AL', sasia: 3, totali: 30 },
      { lloji: 'Dalje', shteti: 'AL', sasia: 1, totali: 10 },
    ])

    expect(summary.XK.in_qty).toBe(10)
    expect(summary.XK.out_qty).toBe(3)
    expect(summary.AL.in_qty).toBe(3)
    expect(summary.AL.out_qty).toBe(1)
  })
})

describe('buildSummaryByLocation', () => {
  it('aggregates by lokacioni_id keys', () => {
    const locA = '00000000-0000-4000-8000-000000000101'
    const locB = '00000000-0000-4000-8000-000000000102'
    const summary = buildSummaryByLocation(
      [
        { lloji: 'Hyrje', lokacioni_id: locA, sasia: 5, totali: 50 },
        { lloji: 'Dalje', lokacioni_id: locB, sasia: 2, totali: 20 },
      ],
      [locA, locB],
    )
    expect(summary[locA].in_qty).toBe(5)
    expect(summary[locB].out_qty).toBe(2)
  })
})

describe('buildSummaryByProduct', () => {
  it('groups by product code with labels', () => {
    const rows = buildSummaryByProduct(
      [
        { lloji: 'Hyrje', kodi_produktit: 'A1', sasia: 4, totali: 40 },
        { lloji: 'Dalje', kodi_produktit: 'A1', sasia: 1, totali: 10 },
        { lloji: 'Hyrje', kodi_produktit: 'B2', sasia: 2, totali: 20 },
      ],
      [{ kodi: 'A1', emri: 'Alpha' }, { kodi: 'B2', emri: 'Beta' }],
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      id: 'A1',
      label: 'Alpha (A1)',
      in_qty: 4,
      out_qty: 1,
    })
    expect(rows[1]).toMatchObject({
      id: 'B2',
      label: 'Beta (B2)',
      in_qty: 2,
      out_qty: 0,
    })
  })
})

describe('buildSummaryByUser', () => {
  it('groups by creator and prefers display name', () => {
    const userA = '00000000-0000-4000-8000-000000000201'
    const rows = buildSummaryByUser(
      [
        { lloji: 'Hyrje', created_by_user_id: userA, sasia: 3, totali: 30 },
        { lloji: 'Dalje', created_by_user_id: userA, sasia: 1, totali: 10 },
      ],
      [{ id: userA, emri: 'Arben', email: 'arben@example.com' }],
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: userA,
      label: 'Arben',
      in_qty: 3,
      out_qty: 1,
    })
  })
})

describe('buildGroupedSummaryRows', () => {
  it('returns ordered location rows with zeros', () => {
    const locA = '00000000-0000-4000-8000-000000000101'
    const locB = '00000000-0000-4000-8000-000000000102'
    const rows = buildGroupedSummaryRows('location', {
      locationRows: [{ lloji: 'Hyrje', lokacioni_id: locA, sasia: 2, totali: 20 }],
      productRows: [],
      userRows: [],
      locationIds: [locA, locB],
      locations: [
        { id: locA, emri: 'Kosova' },
        { id: locB, emri: 'Shqiperi' },
      ],
      products: [],
      users: [],
    })

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ id: locA, label: 'Kosova', in_qty: 2 })
    expect(rows[1]).toMatchObject({ id: locB, label: 'Shqiperi', in_qty: 0 })
  })
})
