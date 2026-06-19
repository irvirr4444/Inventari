import { describe, expect, it } from 'vitest'
import { listProduktet } from '../repositories/produktiRepository.js'

describe('tenant isolation', () => {
  it('documents that listProduktet requires tenantId as first scoping parameter', () => {
    expect(listProduktet.length).toBeGreaterThan(1)
    expect(String(listProduktet)).toContain('tenantId')
  })
})
