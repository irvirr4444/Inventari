import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listActionBatches } from '../lib/api'
import type { HistoryServerFilters } from '../lib/historyClientFilters'
import { queryKeys } from '../lib/queryKeys'

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
  })
}

export function historyListRefreshState(query: {
  isLoading: boolean
  isFetching: boolean
  isPlaceholderData: boolean
  dataUpdatedAt: number
}) {
  return {
    isInitialLoad: query.isLoading,
    isRefreshing: query.isFetching && query.isPlaceholderData,
    resultsBodyKey: query.dataUpdatedAt,
  }
}
