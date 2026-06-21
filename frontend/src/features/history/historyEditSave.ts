import type { Country } from '../../lib/country'
import { formatDisplayTime } from '../../lib/actionMeta'
import type { ActionBatchDetail, HistoryActionItem } from '../../lib/api'

export type HistoryEditSaveResult = {
  batch_id?: string
  metaChanged: boolean
  itemsChanged: boolean
}

type ItemDraft = {
  kodi_produktit: string
  cmimi_njesi: string
  sasia: string
  shenim: string
}

export function batchMetaChanged(
  detail: ActionBatchDetail,
  meta: {
    data: string
    ora: string
    pershkrimi: string
    shteti: Country
    destination: Country | ''
  },
): boolean {
  const oraNorm = meta.ora.trim() || null
  const detailOra = detail.ora ? formatDisplayTime(detail.ora) : null
  const pershNorm = meta.pershkrimi.trim() || null
  const detailPersh = detail.pershkrimi?.trim() || null

  if (meta.data !== detail.data) return true
  if (oraNorm !== detailOra) return true
  if (pershNorm !== detailPersh) return true

  if (detail.lloji === 'Transfer') {
    if (meta.shteti !== detail.shteti) return true
    if ((meta.destination || null) !== (detail.destination_shteti ?? null)) return true
  } else if (!detail.mirrored_to_albania && meta.shteti !== detail.shteti) {
    return true
  }

  return false
}

export function historyItemsChanged(
  items: HistoryActionItem[],
  drafts: Record<string, ItemDraft>,
): boolean {
  return items.some((item) => {
    const draft = drafts[item.id]
    if (!draft) return false
    const draftShenim = draft.shenim.trim()
    const itemShenim = item.shenim?.trim() ?? ''
    return (
      draft.kodi_produktit !== item.kodi_produktit ||
      Number(draft.cmimi_njesi) !== item.cmimi_njesi ||
      Number(draft.sasia) !== item.sasia ||
      draftShenim !== itemShenim
    )
  })
}
