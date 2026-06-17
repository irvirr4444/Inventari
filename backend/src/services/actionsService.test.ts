import { describe, expect, it } from 'vitest'
import {
  ERR_TRANSFER_NEEDS_DESTINATION,
  ERR_TRANSFER_SAME_COUNTRY,
} from '@inventari/shared'
import { validateTransfer, buildVeprimRows } from '../services/actionsService.js'

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
  it('creates Dalje and Hyrje rows for transfer', () => {
    const { rows, mirrorRows } = buildVeprimRows({
      lloji: 'Transfer',
      shteti: 'XK',
      destination_shteti: 'AL',
      data: '2026-06-17',
      items: [{ kodi_produktit: 'P1', cmimi_njesi: 2, sasia: 5 }],
    })

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ lloji: 'Dalje', shteti: 'XK', sasia: 5 })
    expect(rows[1]).toMatchObject({ lloji: 'Hyrje', shteti: 'AL', sasia: 5 })
    expect(mirrorRows).toHaveLength(0)
  })

  it('mirrors Kosovo Dalje to Albania Hyrje', () => {
    const { mirrorRows } = buildVeprimRows({
      lloji: 'Dalje',
      shteti: 'XK',
      items: [{ kodi_produktit: 'P1', cmimi_njesi: 2, sasia: 5 }],
    })

    expect(mirrorRows).toHaveLength(1)
    expect(mirrorRows[0]).toMatchObject({ lloji: 'Hyrje', shteti: 'AL', sasia: 5 })
  })
})
