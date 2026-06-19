export function isLegacyBatchId(id: string): boolean {
  return id.startsWith('legacy:')
}
