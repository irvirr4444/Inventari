import { randomId } from '../lib/randomId'

export type ActionItemDraft = {
  key: string
  kodi_produktit: string
  cmimi_njesi: string
  sasia: string
  shenim: string
}

export function createEmptyActionItem(): ActionItemDraft {
  return { key: randomId(), kodi_produktit: '', cmimi_njesi: '', sasia: '1', shenim: '' }
}

/** Empty quantity counts as 1; explicit 0 remains 0 for validation. */
export function effectiveSasia(value: string | number): number {
  const trimmed = String(value).trim()
  if (trimmed === '') return 1
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : 1
}

export function toActionItemPayload(draft: ActionItemDraft) {
  return {
    kodi_produktit: draft.kodi_produktit.trim(),
    cmimi_njesi: Number(draft.cmimi_njesi) || 0,
    sasia: effectiveSasia(draft.sasia),
    ...(draft.shenim.trim() ? { shenim: draft.shenim.trim() } : {}),
  }
}
