export type ActionItemDraft = {
  key: string
  kodi_produktit: string
  cmimi_njesi: string
  sasia: number
}

export function createEmptyActionItem(): ActionItemDraft {
  return { key: crypto.randomUUID(), kodi_produktit: '', cmimi_njesi: '', sasia: 1 }
}
