import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsSummary } from '../lib/api'
import { isoDateDaysAgo } from '../lib/dates'
import { queryKeys } from '../lib/queryKeys'

export function useSummaryQuery(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.analyticsSummary(from, to),
    queryFn: () => analyticsSummary({ from, to }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useSummaryDateRange() {
  const [from, setFrom] = React.useState(() => isoDateDaysAgo(30))
  const [to, setTo] = React.useState(() => isoDateDaysAgo(0))
  const query = useSummaryQuery(from, to)
  const emptySummary = { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 }
  return { from, setFrom, to, setTo, query, emptySummary }
}
