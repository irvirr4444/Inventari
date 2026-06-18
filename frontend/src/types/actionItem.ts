import { randomId } from '../lib/randomId'

export type ActionItemDraft = {
  key: string
  kodi_produktit: string
  cmimi_njesi: string
  sasia: string
}

export function createEmptyActionItem(): ActionItemDraft {
  return { key: randomId(), kodi_produktit: '', cmimi_njesi: '', sasia: '' }
}
