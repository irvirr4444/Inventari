import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'

export type InvalidateScope = 'products' | 'summary' | 'history' | 'all'

export async function invalidateAfterMutation(
  qc: QueryClient,
  scope: InvalidateScope,
  options?: { actionBatchId?: string; userId?: string },
) {
  const tasks: Promise<void>[] = []
  const userId = options?.userId

  if (scope === 'products' || scope === 'all') {
    tasks.push(qc.invalidateQueries({ queryKey: queryKeys.products(userId) }))
  }

  if (scope === 'summary' || scope === 'all') {
    tasks.push(qc.invalidateQueries({ queryKey: ['analytics-summary', userId] }))
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

/** Fire-and-forget cache invalidation after UI has already closed / notified. */
export function scheduleInvalidate(
  qc: QueryClient,
  scope: InvalidateScope,
  options?: { actionBatchId?: string; userId?: string },
) {
  void invalidateAfterMutation(qc, scope, options)
}

export function scheduleProductDeleteInvalidation(qc: QueryClient, userId?: string) {
  scheduleInvalidate(qc, 'products', { userId })
  scheduleInvalidate(qc, 'summary', { userId })
}
