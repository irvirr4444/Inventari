export type PaginationItem = number | 'ellipsis'

/** Compact page list for large totals, e.g. 1 … 6 7 [8] 9 10 … 50 */
export function getPaginationRange(page: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 0) return []
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const items: PaginationItem[] = []
  const windowRadius = 1
  const windowStart = Math.max(2, page - windowRadius)
  const windowEnd = Math.min(totalPages - 1, page + windowRadius)

  items.push(1)

  if (windowStart > 2) {
    items.push('ellipsis')
  } else {
    for (let p = 2; p < windowStart; p += 1) items.push(p)
  }

  for (let p = windowStart; p <= windowEnd; p += 1) {
    items.push(p)
  }

  if (windowEnd < totalPages - 1) {
    items.push('ellipsis')
  } else {
    for (let p = windowEnd + 1; p < totalPages; p += 1) items.push(p)
  }

  items.push(totalPages)
  return items
}
