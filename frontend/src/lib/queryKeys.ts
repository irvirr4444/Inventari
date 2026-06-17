export const queryKeys = {
  products: ['products'] as const,
  analyticsSummary: (from: string, to: string) => ['analytics-summary', from, to] as const,
  actionBatches: (filters: Record<string, unknown>) => ['action-batches', filters] as const,
  actionBatch: (id: string) => ['action-batch', id] as const,
}
