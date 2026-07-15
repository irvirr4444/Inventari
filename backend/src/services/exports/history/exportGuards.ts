import { AppError } from '../../../errors.js'
import type { HistoryExportQuery } from './historyExportService.js'

const DEFAULT_MAX_BATCH_IDS = 500
const DEFAULT_MAX_EXPORT_BATCHES = 500
const DEFAULT_MAX_DATE_RANGE_DAYS = 366
const DEFAULT_MAX_CONCURRENT_EXPORTS = 2
const DEFAULT_DETAIL_CONCURRENCY = 6

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const EXPORT_LIMITS = {
  maxBatchIds: () => envInt('EXPORT_MAX_BATCH_IDS', DEFAULT_MAX_BATCH_IDS),
  maxExportBatches: () => envInt('EXPORT_MAX_BATCHES', DEFAULT_MAX_EXPORT_BATCHES),
  maxDateRangeDays: () => envInt('EXPORT_MAX_DATE_RANGE_DAYS', DEFAULT_MAX_DATE_RANGE_DAYS),
  maxConcurrentExports: () =>
    envInt('EXPORT_MAX_CONCURRENT', DEFAULT_MAX_CONCURRENT_EXPORTS),
  detailConcurrency: () => envInt('EXPORT_DETAIL_CONCURRENCY', DEFAULT_DETAIL_CONCURRENCY),
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Fail fast before expensive export work. */
export function assertHistoryExportGuards(query: HistoryExportQuery): void {
  const maxBatchIds = EXPORT_LIMITS.maxBatchIds()
  if (query.batchIds && query.batchIds.length > maxBatchIds) {
    throw new AppError(
      400,
      `Shume veprime per eksport (${query.batchIds.length}). Maksimumi eshte ${maxBatchIds}. Ngushto filtrat.`,
    )
  }

  const maxDays = EXPORT_LIMITS.maxDateRangeDays()
  if (query.dateFrom && query.dateTo) {
    const from = parseIsoDate(query.dateFrom)
    const to = parseIsoDate(query.dateTo)
    if (from && to) {
      const diffDays = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1
      if (diffDays > maxDays) {
        throw new AppError(
          400,
          `Intervali i dates eshte shume i gjate (${diffDays} dite). Maksimumi eshte ${maxDays} dite.`,
        )
      }
    }
  }
}

export function assertExportBatchCount(count: number): void {
  const max = EXPORT_LIMITS.maxExportBatches()
  if (count > max) {
    throw new AppError(
      400,
      `Shume veprime per eksport (${count}). Maksimumi eshte ${max}. Ngushto filtrat.`,
    )
  }
}

/** Run async work over items with a fixed concurrency limit. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []
  const limit = Math.max(1, Math.min(concurrency, items.length))
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index]!, index)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()))
  return results
}

/** Simple in-process semaphore so exports don't starve interactive API traffic. */
let activeExports = 0
const waitQueue: Array<() => void> = []

export async function withExportSlot<T>(run: () => Promise<T>): Promise<T> {
  const max = EXPORT_LIMITS.maxConcurrentExports()

  if (activeExports >= max) {
    await new Promise<void>((resolve) => {
      waitQueue.push(resolve)
    })
  }

  activeExports += 1
  try {
    return await run()
  } finally {
    activeExports -= 1
    const next = waitQueue.shift()
    if (next) next()
  }
}
