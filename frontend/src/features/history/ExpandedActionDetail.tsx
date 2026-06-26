import { useQuery } from '@tanstack/react-query'
import { getActionBatch } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthProvider'
import { HistoryDetailPending } from './HistoryDetailPending'

export function ExpandedActionDetail(props: {
  actionId: string
  highlightShenim?: string
}) {
  const { user } = useAuth()
  const detailQuery = useQuery({
    queryKey: queryKeys.actionBatch(user?.id, props.actionId),
    queryFn: () => getActionBatch(props.actionId),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  if (detailQuery.isLoading && !detailQuery.data) {
    return (
      <div className="history-expanded-panel">
        <HistoryDetailPending />
      </div>
    )
  }

  if (detailQuery.isError) {
    return (
      <div className="history-expanded-panel">
        <p className="muted">
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : 'Gabim gjate ngarkimit te detajeve.'}
        </p>
      </div>
    )
  }

  if (detailQuery.data) {
    return (
      <ActionReadOnlyPanel
        detail={detailQuery.data}
        highlightShenim={props.highlightShenim}
      />
    )
  }

  return null
}
