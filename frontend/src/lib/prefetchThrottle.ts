/**
 * Throttles hover/focus prefetch storms while still prefetching the latest target.
 * Skips work when the query already has cached data or an in-flight fetch.
 */
export function createPrefetchThrottler(options?: { minIntervalMs?: number }) {
  const minIntervalMs = options?.minIntervalMs ?? 150
  let lastAt = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingId: string | null = null

  const run = (
    id: string,
    prefetch: (id: string) => void,
    shouldSkip: (id: string) => boolean,
  ) => {
    if (shouldSkip(id)) return

    const now = Date.now()
    const elapsed = now - lastAt
    if (elapsed >= minIntervalMs) {
      lastAt = now
      prefetch(id)
      return
    }

    pendingId = id
    if (timer != null) return

    timer = setTimeout(() => {
      timer = null
      const nextId = pendingId
      pendingId = null
      if (!nextId || shouldSkip(nextId)) return
      lastAt = Date.now()
      prefetch(nextId)
    }, minIntervalMs - elapsed)
  }

  return { run }
}
