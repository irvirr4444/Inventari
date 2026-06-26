export function fmtEuro(value: number): string {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

export function fmtInt(value: number): string {
  return value.toLocaleString('en-US')
}

export const LLOJI_BADGE_COLORS = {
  Hyrje: { fill: '#dcfce7', text: '#166534' },
  Dalje: { fill: '#fee2e2', text: '#991b1b' },
  Transfer: { fill: '#dbeafe', text: '#1e40af' },
} as const
