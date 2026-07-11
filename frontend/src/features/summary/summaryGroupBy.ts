import type { SummaryGroupBy } from '@inventari/shared'

export const SUMMARY_GROUP_BY_OPTIONS: Array<{ value: SummaryGroupBy; label: string }> = [
  { value: 'location', label: 'Vendodhjes' },
  { value: 'product', label: 'Produktit' },
  { value: 'user', label: 'Perdoruesit' },
]

export function summaryGroupByLabel(groupBy: SummaryGroupBy): string {
  return SUMMARY_GROUP_BY_OPTIONS.find((opt) => opt.value === groupBy)?.label ?? groupBy
}
