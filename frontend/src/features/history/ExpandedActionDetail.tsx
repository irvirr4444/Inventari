import { useQuery } from '@tanstack/react-query'
import { getActionBatch } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'
import { ActionReadOnlyPanel } from './ActionReadOnlyPanel'

export function ExpandedActionDetail(props: { actionId: string }) {
  const detailQuery = useQuery({
    queryKey: queryKeys.actionBatch(props.actionId),
    queryFn: () => getActionBatch(props.actionId),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  if (detailQuery.isLoading && !detailQuery.data) {
    return (
      <div className="history-expanded-panel">
        <div className="history-skeleton-block" />
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
    return <ActionReadOnlyPanel detail={detailQuery.data} />
  }

  return null
}
