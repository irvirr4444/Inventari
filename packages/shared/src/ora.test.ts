import { describe, expect, it } from 'vitest'
import { formatOraDisplay, normalizeOraInput } from './ora.js'

describe('normalizeOraInput', () => {
  it('returns undefined for empty values', () => {
    expect(normalizeOraInput('')).toBeUndefined()
    expect(normalizeOraInput('   ')).toBeUndefined()
    expect(normalizeOraInput(null)).toBeUndefined()
  })

  it('accepts HH:mm', () => {
    expect(normalizeOraInput('09:30')).toBe('09:30')
    expect(normalizeOraInput(' 14:05 ')).toBe('14:05')
  })

  it('rejects invalid times', () => {
    expect(normalizeOraInput('25:00')).toBeUndefined()
    expect(normalizeOraInput('abc')).toBeUndefined()
  })
})

describe('formatOraDisplay', () => {
  it('formats postgres time strings', () => {
    expect(formatOraDisplay('14:30:00')).toBe('14:30')
    expect(formatOraDisplay('09:05:00')).toBe('09:05')
  })

  it('returns empty for missing values', () => {
    expect(formatOraDisplay(null)).toBe('')
    expect(formatOraDisplay(undefined)).toBe('')
  })
})
