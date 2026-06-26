export function queryRefreshState(query: { isFetching: boolean; data: unknown }) {
  const hasData = query.data != null
  return {
    isInitialLoad: !hasData && query.isFetching,
    isRefreshing: hasData && query.isFetching,
  }
}
