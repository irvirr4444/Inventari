import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SummaryGroupBy } from '@inventari/shared'
import { analyticsSummary } from '../lib/api'
import { isoDateDaysAgo } from '../lib/dates'
import { queryKeys } from '../lib/queryKeys'
import { useAuth } from '../lib/auth/AuthProvider'

export function useSummaryQuery(from: string, to: string, groupBy: SummaryGroupBy = 'location') {
  const { user } = useAuth()
  return useQuery({
    queryKey: queryKeys.analyticsSummary(user?.id, from, to, groupBy),
    queryFn: () => analyticsSummary({ from, to, groupBy }),
    enabled: Boolean(user),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    placeholderData: (previousData, previousQuery) => {
      if (!previousData || !previousQuery) return undefined
      const previousGroupBy = previousQuery.queryKey[4]
      if (previousGroupBy === groupBy) return previousData
      return undefined
    },
  })
}

export function useSummaryDateRange(groupBy: SummaryGroupBy = 'location') {
  const [from, setFrom] = React.useState(() => isoDateDaysAgo(30))
  const [to, setTo] = React.useState(() => isoDateDaysAgo(0))
  const query = useSummaryQuery(from, to, groupBy)
  const emptySummary = { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 }
  return { from, setFrom, to, setTo, query, emptySummary }
}
