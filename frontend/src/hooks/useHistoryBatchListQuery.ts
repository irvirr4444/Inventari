import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listActionBatches } from '../lib/api'
import type { HistoryServerFilters } from '../lib/historyClientFilters'
import { queryKeys } from '../lib/queryKeys'
import { queryRefreshState } from '../lib/queryRefreshState'

export function useHistoryBatchListQuery(
  userId: string | undefined,
  filters: HistoryServerFilters,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: [...queryKeys.actionBatches(userId, filters), page],
    queryFn: () =>
      listActionBatches({
        ...filters,
        page,
        limit: pageSize,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function historyListRefreshState(query: {
  isFetching: boolean
  data: unknown
}) {
  return queryRefreshState(query)
}
