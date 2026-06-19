export const queryKeys = {
  products: (userId?: string) => ['products', userId] as const,
  lokacionet: (userId?: string) => ['lokacionet', userId] as const,
  analyticsSummary: (userId: string | undefined, from: string, to: string) =>
    ['analytics-summary', userId, from, to] as const,
  actionBatches: (userId: string | undefined, filters: Record<string, unknown>) =>
    ['action-batches', userId, filters] as const,
  actionBatch: (userId: string | undefined, id: string) => ['action-batch', userId, id] as const,
}
