import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'

export type InvalidateScope = 'products' | 'summary' | 'history' | 'all'

export async function invalidateAfterMutation(
  qc: QueryClient,
  scope: InvalidateScope,
  options?: { actionBatchId?: string; refetchSummary?: boolean; userId?: string },
) {
  const tasks: Promise<void>[] = []
  const userId = options?.userId

  if (scope === 'products' || scope === 'all') {
    tasks.push(qc.invalidateQueries({ queryKey: queryKeys.products(userId) }))
  }

  if (scope === 'summary' || scope === 'all') {
    tasks.push(qc.invalidateQueries({ queryKey: ['analytics-summary', userId] }))
    if (options?.refetchSummary) {
      tasks.push(qc.refetchQueries({ queryKey: ['analytics-summary', userId], type: 'active' }))
    }
  }

  if (scope === 'history' || scope === 'all') {
    tasks.push(qc.invalidateQueries({ queryKey: ['action-batches', userId] }))
    if (options?.actionBatchId) {
      tasks.push(
        qc.invalidateQueries({ queryKey: queryKeys.actionBatch(userId, options.actionBatchId) }),
      )
    }
  }

  await Promise.all(tasks)
}
