import { describe, expect, it } from 'vitest'
import { buildSummaryByCountry } from './analytics.js'
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
