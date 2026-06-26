import { listActionBatches, type ActionBatch } from './api'
import type { HistoryServerFilters } from './historyClientFilters'

const PAGE_SIZE = 100

export async function fetchAllActionBatches(
  server: HistoryServerFilters,
): Promise<ActionBatch[]> {
  const all: ActionBatch[] = []
  let page = 1
  let total = 0

  do {
    const res = await listActionBatches({
      ...server,
      page,
      limit: PAGE_SIZE,
    })
    all.push(...res.actions)
    total = res.total
    page += 1
  } while (all.length < total)

  return all
}
