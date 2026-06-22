import type { ActionBatchDetail } from './api'
import { formatDisplayTime } from '../lib/actionMeta'
import {
  createActionBatchItem,
  deleteActionBatchItem,
  updateActionBatch,
  updateActionBatchItem,
  type HistoryActionItem,
} from './api'
import { randomId } from './randomId'
import type { HistoryEditSaveResult } from '../features/history/historyEditSave'
import type { HistoryEditRow, HistoryItemDraft } from './historyBatchEdit'

export type DynamicHistoryBatchMetaDraft = {
  data: string
  ora: string
  pershkrimi: string
  lokacioni_id: string
  destination_lokacioni_id: string
}

export type DynamicHistoryEditSnapshot = {
  meta: DynamicHistoryBatchMetaDraft
  rows: HistoryEditRow[]
}

export function dynamicMetaFromDetail(detail: ActionBatchDetail): DynamicHistoryBatchMetaDraft {
  return {
    data: detail.data,
    ora: detail.ora ? formatDisplayTime(detail.ora) : '',
    pershkrimi: detail.pershkrimi ?? '',
    lokacioni_id: detail.lokacioni_id ?? '',
    destination_lokacioni_id: detail.destination_lokacioni_id ?? '',
  }
}

function metaEqual(a: DynamicHistoryBatchMetaDraft, b: DynamicHistoryBatchMetaDraft): boolean {
  return (
    a.data === b.data &&
    a.ora === b.ora &&
    a.pershkrimi === b.pershkrimi &&
    a.lokacioni_id === b.lokacioni_id &&
    a.destination_lokacioni_id === b.destination_lokacioni_id
  )
}

function rowsEqual(a: HistoryEditRow[], b: HistoryEditRow[]): boolean {
  if (a.length !== b.length) return false
  return a.every((row, i) => {
    const other = b[i]
    if (!other || row.key !== other.key || row.isNew !== other.isNew) return false
    const d = row.draft
    const od = other.draft
    return (
      d.kodi_produktit === od.kodi_produktit &&
      d.cmimi_njesi === od.cmimi_njesi &&
      d.sasia === od.sasia &&
      d.shenim === od.shenim
    )
  })
}

export function isDynamicHistoryEditDirty(
  initial: DynamicHistoryEditSnapshot,
  current: DynamicHistoryEditSnapshot,
): boolean {
  return !metaEqual(initial.meta, current.meta) || !rowsEqual(initial.rows, current.rows)
}

function itemChanged(item: HistoryActionItem, draft: HistoryItemDraft): boolean {
  const draftShenim = draft.shenim.trim()
  const itemShenim = item.shenim?.trim() ?? ''
  return (
    draft.kodi_produktit !== item.kodi_produktit ||
    Number(draft.cmimi_njesi) !== item.cmimi_njesi ||
    Number(draft.sasia) !== item.sasia ||
    draftShenim !== itemShenim
  )
}

function rowsItemsChanged(detail: ActionBatchDetail, rows: HistoryEditRow[]): boolean {
  const originalIds = new Set(detail.items.map((item) => item.id))
  const currentExistingIds = new Set(rows.filter((r) => !r.isNew).map((r) => r.key))
  const deletedIds = [...originalIds].filter((id) => !currentExistingIds.has(id))

  if (deletedIds.length > 0) return true
  if (rows.some((row) => row.isNew)) return true

  return rows.some((row) => {
    if (row.isNew) return false
    const item = detail.items.find((it) => it.id === row.key)
    return item ? itemChanged(item, row.draft) : false
  })
}

export function validateDynamicHistoryBatchEdits(rows: HistoryEditRow[]): string | null {
  for (const row of rows) {
    if (!row.draft.kodi_produktit) return 'Zgjidh produktin per cdo rresht.'
    if (Number(row.draft.sasia) <= 0) return 'Sasia duhet te jete > 0.'
    if (Number(row.draft.cmimi_njesi) < 0) return 'Cmimi nuk mund te jete negative.'
  }
  return null
}

export async function saveDynamicHistoryBatchEdits(input: {
  detail: ActionBatchDetail
  meta: DynamicHistoryBatchMetaDraft
  rows: HistoryEditRow[]
}): Promise<HistoryEditSaveResult> {
  const { detail, meta, rows } = input
  const validationError = validateDynamicHistoryBatchEdits(rows)
  if (validationError) throw new Error(validationError)

  const metaChanged = !metaEqual(dynamicMetaFromDetail(detail), meta)
  const itemsChanged = rowsItemsChanged(detail, rows)

  if (!metaChanged && !itemsChanged) {
    return { metaChanged: false, itemsChanged: false }
  }

  let batchId = detail.id
  let migratedId: string | undefined

  if (metaChanged) {
    const batchPayload: {
      data: string
      lokacioni_id?: string
      destination_lokacioni_id?: string
      ora?: string | null
      pershkrimi?: string | null
    } = { data: meta.data }

    if (detail.lloji === 'Transfer') {
      batchPayload.lokacioni_id = meta.lokacioni_id
      batchPayload.destination_lokacioni_id = meta.destination_lokacioni_id
    } else {
      batchPayload.lokacioni_id = meta.lokacioni_id
    }

    batchPayload.ora = meta.ora.trim() ? meta.ora.trim() : null
    batchPayload.pershkrimi = meta.pershkrimi.trim() ? meta.pershkrimi.trim() : null

    const { batch_id } = await updateActionBatch(detail.id, batchPayload)
    migratedId = batch_id
    batchId = batch_id ?? detail.id
  }

  const originalIds = new Set(detail.items.map((item) => item.id))
  const currentExistingIds = new Set(rows.filter((r) => !r.isNew).map((r) => r.key))
  const deletedIds = [...originalIds].filter((id) => !currentExistingIds.has(id))

  for (const itemId of deletedIds) {
    await deleteActionBatchItem(batchId, itemId)
  }

  for (const row of rows) {
    if (row.isNew) {
      await createActionBatchItem(batchId, {
        kodi_produktit: row.draft.kodi_produktit,
        cmimi_njesi: Number(row.draft.cmimi_njesi) || 0,
        sasia: Number(row.draft.sasia) || 0,
        ...(row.draft.shenim.trim() ? { shenim: row.draft.shenim.trim() } : {}),
      })
    }
  }

  const updateTasks: Array<Promise<{ batch_id?: string }>> = []
  for (const row of rows) {
    if (row.isNew) continue
    const item = detail.items.find((it) => it.id === row.key)
    if (item && itemChanged(item, row.draft)) {
      updateTasks.push(
        updateActionBatchItem(batchId, row.key, {
          kodi_produktit: row.draft.kodi_produktit,
          cmimi_njesi: Number(row.draft.cmimi_njesi) || 0,
          sasia: Number(row.draft.sasia) || 0,
          shenim: row.draft.shenim.trim() ? row.draft.shenim.trim() : null,
        }),
      )
    }
  }

  if (updateTasks.length > 0) {
    const results = await Promise.all(updateTasks)
    for (const result of results) {
      if (result.batch_id) {
        migratedId = result.batch_id
        batchId = result.batch_id
      }
    }
  }

  return {
    batch_id: migratedId,
    metaChanged,
    itemsChanged,
  }
}

export function createEmptyDynamicEditRow(): HistoryEditRow {
  return {
    key: randomId(),
    isNew: true,
    draft: { kodi_produktit: '', cmimi_njesi: '', sasia: '1', shenim: '' },
  }
}
