import type { SummaryGroupBy } from '@inventari/shared'

export const queryKeys = {
  products: (userId?: string) => ['products', userId] as const,
  users: (userId?: string) => ['users', userId] as const,
  lokacionet: (userId?: string) => ['lokacionet', userId] as const,
  analyticsSummary: (
    userId: string | undefined,
    from: string,
    to: string,
    groupBy: SummaryGroupBy,
  ) => ['analytics-summary', userId, from, to, groupBy] as const,
  actionBatches: (userId: string | undefined, filters: Record<string, unknown>) =>
    ['action-batches', userId, filters] as const,
  actionBatchCreatorUserIds: (userId: string | undefined) =>
    ['action-batch-creator-user-ids', userId] as const,
  actionBatch: (userId: string | undefined, id: string) => ['action-batch', userId, id] as const,
}
