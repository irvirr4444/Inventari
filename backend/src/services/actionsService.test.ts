import { describe, expect, it } from 'vitest'
import {
  ERR_TRANSFER_NEEDS_DESTINATION,
  ERR_TRANSFER_SAME_COUNTRY,
} from '@inventari/shared'
import { validateTransfer, buildVeprimRows } from '../services/actionsService.js'
import {
  LEGACY_LOKACIONI_AL_ID,
  LEGACY_LOKACIONI_XK_ID,
} from '../domain/lokacioni.js'

const legacyLokacionet = [
  { id: LEGACY_LOKACIONI_XK_ID, kodi: 'XK' },
  { id: LEGACY_LOKACIONI_AL_ID, kodi: 'AL' },
]

describe('validateTransfer', () => {
  it('requires destination', () => {
    expect(() =>
      validateTransfer({
        lloji: 'Transfer',
        shteti: 'XK',
        items: [{ kodi_produktit: 'A', cmimi_njesi: 1, sasia: 1 }],
      }),
    ).toThrow(ERR_TRANSFER_NEEDS_DESTINATION)
  })

  it('rejects same source and destination', () => {
    expect(() =>
      validateTransfer({
        lloji: 'Transfer',
        shteti: 'XK',
        destination_shteti: 'XK',
        items: [{ kodi_produktit: 'A', cmimi_njesi: 1, sasia: 1 }],
      }),
    ).toThrow(ERR_TRANSFER_SAME_COUNTRY)
  })
})

describe('buildVeprimRows', () => {
  it('creates Dalje and Hyrje rows for dynamic location transfer', () => {
    const locA = '11111111-1111-4111-8111-111111111101'
    const locB = '22222222-2222-4222-8222-222222222222'
    const { rows } = buildVeprimRows(
      {
        lloji: 'Transfer',
        lokacioni_id: locA,
        destination_lokacioni_id: locB,
        data: '2026-06-17',
        items: [{ kodi_produktit: 'P1', cmimi_njesi: 2, sasia: 5 }],
      },
      {
        mirrorToAlbania: false,
        lokacionet: [
          { id: locA, kodi: 'MAG' },
          { id: locB, kodi: 'SHOP' },
        ],
      },
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ lloji: 'Dalje', lokacioni_id: locA, shteti: 'XK', sasia: 5 })
    expect(rows[1]).toMatchObject({ lloji: 'Hyrje', lokacioni_id: locB, shteti: 'XK', sasia: 5 })
  })

  it('creates Dalje and Hyrje rows for transfer', () => {
    const { rows, mirrorRows } = buildVeprimRows(
      {
        lloji: 'Transfer',
        shteti: 'XK',
        destination_shteti: 'AL',
        data: '2026-06-17',
        items: [{ kodi_produktit: 'P1', cmimi_njesi: 2, sasia: 5 }],
      },
      { mirrorToAlbania: false, lokacionet: legacyLokacionet },
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ lloji: 'Dalje', shteti: 'XK', sasia: 5 })
    expect(rows[1]).toMatchObject({ lloji: 'Hyrje', shteti: 'AL', sasia: 5 })
    expect(mirrorRows).toHaveLength(0)
  })

  it('mirrors Kosovo Dalje to Albania Hyrje for legacy users', () => {
    const { mirrorRows } = buildVeprimRows(
      {
        lloji: 'Dalje',
        shteti: 'XK',
        items: [{ kodi_produktit: 'P1', cmimi_njesi: 2, sasia: 5 }],
      },
      { mirrorToAlbania: true, lokacionet: legacyLokacionet },
    )

    expect(mirrorRows).toHaveLength(1)
    expect(mirrorRows[0]).toMatchObject({ lloji: 'Hyrje', shteti: 'AL', sasia: 5 })
  })

  it('does not mirror for dynamic users', () => {
    const { mirrorRows } = buildVeprimRows(
      {
        lloji: 'Dalje',
        shteti: 'XK',
        items: [{ kodi_produktit: 'P1', cmimi_njesi: 2, sasia: 5 }],
      },
      { mirrorToAlbania: false, lokacionet: legacyLokacionet },
    )

    expect(mirrorRows).toHaveLength(0)
  })
})
