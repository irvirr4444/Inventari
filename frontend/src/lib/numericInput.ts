export type NumericInputFormatOptions = {
  allowDecimals?: boolean
  maxFractionDigits?: number
  hideZero?: boolean
}

export function stripNumericFormatting(value: string): string {
  return value.replace(/,/g, '')
}

export function numericInputOptionsFromStep(step?: string | number): NumericInputFormatOptions {
  if (step === undefined || step === 'any') {
    return { allowDecimals: false }
  }

  const stepStr = String(step)
  if (stepStr === '1') {
    return { allowDecimals: false }
  }

  const dotIndex = stepStr.indexOf('.')
  if (dotIndex < 0) {
    return { allowDecimals: false }
  }

  return {
    allowDecimals: true,
    maxFractionDigits: stepStr.length - dotIndex - 1,
  }
}

export function parseNumericInputValue(value: number | string | null | undefined): number | null {
  if (value === '' || value === null || value === undefined) return null

  const raw = stripNumericFormatting(String(value)).trim()
  if (raw === '' || raw === '.') return null

  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function parseNumericFilterValue(value: string): number | '' {
  const n = parseNumericInputValue(value)
  return n === null ? '' : n
}

function formatIntegerWithGrouping(digits: string): string {
  if (digits === '') return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatNumericInputValue(
  value: number | string | null | undefined,
  options: NumericInputFormatOptions = {},
): string {
  if (value === '' || value === null || value === undefined) return ''
  if (options.hideZero !== false && (value === 0 || value === '0')) return ''

  const allowDecimals = options.allowDecimals !== false
  const raw = stripNumericFormatting(String(value))
  if (raw === '') return ''
  if (raw === '.') return allowDecimals ? '.' : ''

  const endsWithDot = allowDecimals && raw.endsWith('.')
  const [intPartRaw, fracPartRaw = ''] = raw.split('.')
  const intDigits = intPartRaw.replace(/\D/g, '')

  if (intDigits === '' && fracPartRaw === '' && !endsWithDot) return ''

  const formattedInt = formatIntegerWithGrouping(intDigits)
  if (!allowDecimals) return formattedInt

  if (endsWithDot) {
    return `${formattedInt || '0'}.`
  }

  if (raw.includes('.')) {
    const fracDigits = fracPartRaw.replace(/\D/g, '')
    const maxFrac = options.maxFractionDigits
    const limitedFrac =
      maxFrac === undefined ? fracDigits : fracDigits.slice(0, Math.max(0, maxFrac))
    return limitedFrac === '' ? formattedInt : `${formattedInt}.${limitedFrac}`
  }

  return formattedInt
}

export function sanitizeNumericInputChange(
  raw: string,
  options: NumericInputFormatOptions = {},
): string {
  if (raw.startsWith('-')) return ''

  const allowDecimals = options.allowDecimals !== false
  const cleaned = stripNumericFormatting(raw)
  let result = ''
  let hasDot = false

  for (const ch of cleaned) {
    if (ch >= '0' && ch <= '9') {
      result += ch
      continue
    }
    if (allowDecimals && ch === '.' && !hasDot) {
      hasDot = true
      result += ch
    }
  }

  if (!allowDecimals) {
    return result.replace(/\./g, '')
  }

  if (options.maxFractionDigits !== undefined && result.includes('.')) {
    const [intPart, fracPart = ''] = result.split('.')
    if (fracPart.length > options.maxFractionDigits) {
      result = `${intPart}.${fracPart.slice(0, options.maxFractionDigits)}`
    }
  }

  return result
}
