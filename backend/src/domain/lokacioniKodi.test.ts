import { describe, expect, it } from 'vitest'
import { deriveKodiBase, kodiCandidateForAttempt, pickAvailableKodi } from './lokacioniKodi.js'

describe('deriveKodiBase', () => {
  it('uses first three letters uppercased', () => {
    expect(deriveKodiBase('Tirana Warehouse')).toBe('TIR')
  })

  it('strips non-letters', () => {
    expect(deriveKodiBase('A-1 Depot')).toBe('ADE')
  })

  it('falls back to LOC when no letters', () => {
    expect(deriveKodiBase('123')).toBe('LOC')
  })
})

describe('kodiCandidateForAttempt', () => {
  it('appends numeric suffix on collision', () => {
    expect(kodiCandidateForAttempt('TIR', 1)).toBe('TIR')
    expect(kodiCandidateForAttempt('TIR', 2)).toBe('TIR2')
    expect(kodiCandidateForAttempt('TIR', 3)).toBe('TIR3')
  })
})

describe('pickAvailableKodi', () => {
  it('dedupes against taken set', () => {
    const taken = new Set(['TIR'])
    expect(pickAvailableKodi('Tirana', taken)).toBe('TIR2')
  })

  it('allows keeping current kodi on rename when still unique', () => {
    const taken = new Set(['TIR', 'ALB'])
    expect(pickAvailableKodi('Tirana', taken, 'TIR')).toBe('TIR')
  })
})
