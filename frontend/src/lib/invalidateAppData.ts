import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'

export type InvalidateScope = 'products' | 'summary' | 'history' | 'all'

export async function invalidateAfterMutation(
  qc: QueryClient,
  scope: InvalidateScope,
  options?: { actionBatchId?: string; refetchSummary?: boolean },
) {
  const tasks: Promise<void>[] = []

  if (scope === 'products' || scope === 'all') {
    tasks.push(qc.invalidateQueries({ queryKey: queryKeys.products }))
  }

  if (scope === 'summary' || scope === 'all') {
    tasks.push(qc.invalidateQueries({ queryKey: ['analytics-summary'] }))
    if (options?.refetchSummary) {
      tasks.push(qc.refetchQueries({ queryKey: ['analytics-summary'], type: 'active' }))
    }
  }

  if (scope === 'history' || scope === 'all') {
    tasks.push(qc.invalidateQueries({ queryKey: ['action-batches'] }))
    if (options?.actionBatchId) {
      tasks.push(qc.invalidateQueries({ queryKey: queryKeys.actionBatch(options.actionBatchId) }))
    }
  }

  await Promise.all(tasks)
}
