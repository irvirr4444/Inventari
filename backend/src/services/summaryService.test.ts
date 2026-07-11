import { describe, expect, it } from 'vitest'
import { buildGroupedSummaryRows } from '@inventari/shared'

describe('summary grouping access shape', () => {
  it('filters location rows to allowed summary locations', () => {
    const locA = '00000000-0000-4000-8000-000000000101'
    const locB = '00000000-0000-4000-8000-000000000102'
    const rows = buildGroupedSummaryRows('location', {
      locationRows: [
        { lloji: 'Hyrje', lokacioni_id: locA, sasia: 5, totali: 50 },
        { lloji: 'Dalje', lokacioni_id: locB, sasia: 2, totali: 20 },
      ],
      productRows: [],
      userRows: [],
      locationIds: [locA],
      locations: [{ id: locA, emri: 'Kosova' }],
      products: [],
      users: [],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: locA, in_qty: 5, out_qty: 0 })
  })

  it('attributes product totals across locations', () => {
    const rows = buildGroupedSummaryRows('product', {
      locationRows: [],
      productRows: [
        { lloji: 'Hyrje', kodi_produktit: 'A1', sasia: 3, totali: 30 },
        { lloji: 'Dalje', kodi_produktit: 'A1', sasia: 1, totali: 10 },
      ],
      userRows: [],
      locationIds: [],
      locations: [],
      products: [{ kodi: 'A1', emri: 'Alpha' }],
      users: [],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: 'A1',
      label: 'Alpha (A1)',
      in_qty: 3,
      out_qty: 1,
    })
  })

  it('groups by user id with owner fallback label', () => {
    const ownerId = '00000000-0000-4000-8000-000000000301'
    const rows = buildGroupedSummaryRows('user', {
      locationRows: [],
      productRows: [],
      userRows: [
        { lloji: 'Hyrje', created_by_user_id: ownerId, sasia: 7, totali: 70 },
      ],
      locationIds: [],
      locations: [],
      products: [],
      users: [{ id: ownerId, emri: 'Owner', email: null }],
    })

    expect(rows[0]).toMatchObject({
      id: ownerId,
      label: 'Owner',
      in_qty: 7,
    })
  })
})
