import { describe, expect, it } from 'vitest'
import { buildMatchedItems, shenimMatches } from './batchShenimFilter.js'

describe('shenimMatches', () => {
  it('matches case-insensitively', () => {
    expect(shenimMatches('Fragile BOX', 'fragile')).toBe(true)
    expect(shenimMatches('note', 'NOTE')).toBe(true)
  })

  it('rejects empty shenim or query', () => {
    expect(shenimMatches(null, 'x')).toBe(false)
    expect(shenimMatches('  ', 'x')).toBe(false)
    expect(shenimMatches('hello', '')).toBe(false)
  })
})

describe('buildMatchedItems', () => {
  it('returns only matching rows with product labels', () => {
    const names = new Map([['P1', 'Widget']])
    const items = buildMatchedItems(
      [
        { id: '1', kodi_produktit: 'P1', shenim: 'fragile' },
        { id: '2', kodi_produktit: 'P1', shenim: null },
      ],
      'frag',
      names,
    )
    expect(items).toEqual([
      { id: '1', productLabel: 'Widget (P1)', shenim: 'fragile' },
    ])
  })
})
