import type { Country } from './country'
import {
  batchMetaChanged,
  type HistoryEditSaveResult,
} from '../features/history/historyEditSave'
import {
  createActionBatchItem,
  deleteActionBatchItem,
  updateActionBatch,
  updateActionBatchItem,
  type ActionBatchDetail,
  type HistoryActionItem,
} from './api'
import { randomId } from './randomId'

export type { HistoryEditSaveResult }

export type HistoryItemDraft = {
  kodi_produktit: string
  cmimi_njesi: string
  sasia: string
}

export type HistoryEditRow = {
  key: string
  isNew: boolean
  draft: HistoryItemDraft
}

export type HistoryBatchMetaDraft = {
  data: string
  ora: string
  pershkrimi: string
  shteti: Country
  destination: Country | ''
}

export type HistoryEditSnapshot = {
  meta: HistoryBatchMetaDraft
  rows: HistoryEditRow[]
}

export function rowsFromDetail(items: HistoryActionItem[]): HistoryEditRow[] {
  return items.map((item) => ({
    key: item.id,
    isNew: false,
    draft: {
      kodi_produktit: item.kodi_produktit,
      cmimi_njesi: String(item.cmimi_njesi),
      sasia: String(item.sasia),
    },
  }))
}

export function createEmptyEditRow(): HistoryEditRow {
  return {
    key: randomId(),
    isNew: true,
    draft: { kodi_produktit: '', cmimi_njesi: '', sasia: '1' },
  }
}

export function lineTotal(draft: HistoryItemDraft): number {
  return (Number(draft.cmimi_njesi) || 0) * (Number(draft.sasia) || 0)
}

export function batchTotal(rows: HistoryEditRow[]): number {
  return rows.reduce((sum, row) => sum + lineTotal(row.draft), 0)
}

export function itemChanged(item: HistoryActionItem, draft: HistoryItemDraft): boolean {
  return (
    draft.kodi_produktit !== item.kodi_produktit ||
    Number(draft.cmimi_njesi) !== item.cmimi_njesi ||
    Number(draft.sasia) !== item.sasia
  )
}

function metaEqual(a: HistoryBatchMetaDraft, b: HistoryBatchMetaDraft): boolean {
  return (
    a.data === b.data &&
    a.ora === b.ora &&
    a.pershkrimi === b.pershkrimi &&
    a.shteti === b.shteti &&
    a.destination === b.destination
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
      d.sasia === od.sasia
    )
  })
}

export function isHistoryEditDirty(initial: HistoryEditSnapshot, current: HistoryEditSnapshot): boolean {
  return !metaEqual(initial.meta, current.meta) || !rowsEqual(initial.rows, current.rows)
}

export function validateHistoryBatchEdits(rows: HistoryEditRow[]): string | null {
  for (const row of rows) {
    if (!row.draft.kodi_produktit) {
      return 'Zgjidh produktin per cdo rresht.'
    }
    if (Number(row.draft.sasia) <= 0) {
      return 'Sasia duhet te jete > 0.'
    }
    if (Number(row.draft.cmimi_njesi) < 0) {
      return 'Cmimi nuk mund te jete negative.'
    }
  }

  const kodis = rows.map((row) => row.draft.kodi_produktit).filter(Boolean)
  const duplicate = kodis.find((kodi, i) => kodis.indexOf(kodi) !== i)
  if (duplicate) {
    return 'Produkti është zgjedhur dy herë.'
  }

  return null
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

export async function saveHistoryBatchEdits(input: {
  detail: ActionBatchDetail
  meta: HistoryBatchMetaDraft
  rows: HistoryEditRow[]
}): Promise<HistoryEditSaveResult> {
  const { detail, meta, rows } = input
  const validationError = validateHistoryBatchEdits(rows)
  if (validationError) {
    throw new Error(validationError)
  }

  const metaChanged = batchMetaChanged(detail, meta)
  const itemsChanged = rowsItemsChanged(detail, rows)

  if (!metaChanged && !itemsChanged) {
    return { metaChanged: false, itemsChanged: false }
  }

  let batchId = detail.id
  let migratedId: string | undefined

  if (metaChanged) {
    const batchPayload: {
      data: string
      shteti?: Country
      destination_shteti?: Country
      ora?: string | null
      pershkrimi?: string | null
    } = { data: meta.data }

    if (detail.lloji === 'Transfer') {
      batchPayload.shteti = meta.shteti
      if (meta.destination) batchPayload.destination_shteti = meta.destination as Country
    } else if (!detail.mirrored_to_albania) {
      batchPayload.shteti = meta.shteti
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

/** @deprecated use rowsFromDetail */
export function draftsFromItems(items: HistoryActionItem[]): Record<string, HistoryItemDraft> {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        kodi_produktit: item.kodi_produktit,
        cmimi_njesi: String(item.cmimi_njesi),
        sasia: String(item.sasia),
      },
    ]),
  )
}
