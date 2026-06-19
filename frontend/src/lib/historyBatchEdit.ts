import type { Country } from './country'
import {
  updateActionBatch,
  updateActionBatchItem,
  type ActionBatchDetail,
  type HistoryActionItem,
} from './api'
import { productLabel } from './format'

export type HistoryItemDraft = {
  kodi_produktit: string
  cmimi_njesi: string
  sasia: string
}

export type HistoryBatchMetaDraft = {
  data: string
  ora: string
  pershkrimi: string
  shteti: Country
  destination: Country | ''
}

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

export function itemChanged(item: HistoryActionItem, draft: HistoryItemDraft): boolean {
  return (
    draft.kodi_produktit !== item.kodi_produktit ||
    Number(draft.cmimi_njesi) !== item.cmimi_njesi ||
    Number(draft.sasia) !== item.sasia
  )
}

export function validateHistoryBatchEdits(
  items: HistoryActionItem[],
  itemDrafts: Record<string, HistoryItemDraft>,
): string | null {
  for (const item of items) {
    const draft = itemDrafts[item.id]
    if (!draft?.kodi_produktit) {
      return 'Zgjidh produktin per cdo rresht.'
    }
    if (Number(draft.sasia) <= 0) {
      return 'Sasia duhet te jete > 0.'
    }
    if (Number(draft.cmimi_njesi) < 0) {
      return 'Cmimi nuk mund te jete negative.'
    }
  }

  const kodis = items.map((item) => itemDrafts[item.id]?.kodi_produktit).filter(Boolean)
  const duplicate = kodis.find((kodi, i) => kodis.indexOf(kodi) !== i)
  if (duplicate) {
    const dupItem = items.find((it) => itemDrafts[it.id]?.kodi_produktit === duplicate)
    return dupItem
      ? `Ky produkt eshte dy here ne liste: ${productLabel(
          dupItem.emri_produktit,
          dupItem.kodi_produktit,
        )}`
      : 'Produkti i njejte nuk mund te perseritet ne liste.'
  }

  return null
}

export async function saveHistoryBatchEdits(input: {
  detail: ActionBatchDetail
  meta: HistoryBatchMetaDraft
  itemDrafts: Record<string, HistoryItemDraft>
  isLegacy: boolean
}): Promise<void> {
  const { detail, meta, itemDrafts, isLegacy } = input
  const validationError = validateHistoryBatchEdits(detail.items, itemDrafts)
  if (validationError) {
    throw new Error(validationError)
  }

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

  if (!isLegacy) {
    batchPayload.ora = meta.ora.trim() ? meta.ora.trim() : null
    batchPayload.pershkrimi = meta.pershkrimi.trim() ? meta.pershkrimi.trim() : null
  }

  await updateActionBatch(detail.id, batchPayload)

  const changedItems = detail.items.filter((item) => itemChanged(item, itemDrafts[item.id]))
  await Promise.all(
    changedItems.map((item) => {
      const draft = itemDrafts[item.id]
      return updateActionBatchItem(detail.id, item.id, {
        kodi_produktit: draft.kodi_produktit,
        cmimi_njesi: Number(draft.cmimi_njesi) || 0,
        sasia: Number(draft.sasia) || 0,
      })
    }),
  )
}
