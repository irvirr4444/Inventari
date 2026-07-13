import type { GroupedSummaryResult, SummaryByCountry, SummaryGroupBy } from '@inventari/shared'
import { http } from './http'

export type { CountrySummary as CountrySummaryData, SummaryByCountry } from '@inventari/shared'
export type {
  GroupedSummaryResult,
  GroupedSummaryRow,
  SummaryGroupBy,
} from '@inventari/shared'

export async function analyticsSummary(opts: {
  from: string
  to: string
  groupBy?: SummaryGroupBy
}): Promise<SummaryByCountry | GroupedSummaryResult> {
  const qs = new URLSearchParams(opts)
  const res = await http<{ data: SummaryByCountry | GroupedSummaryResult }>(
    `/analytics/summary?${qs.toString()}`,
  )
  return res.data
}
