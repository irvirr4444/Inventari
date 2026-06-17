import type { BatchLloji, Country } from '@inventari/shared'

export type VeprimBatchLike = {
  lloji: BatchLloji
  shteti: Country
}

export type VeprimRowLike = {
  id: string
  lloji: 'Hyrje' | 'Dalje'
  shteti: Country
  kodi_produktit: string
}

export function isDisplayRow(batch: VeprimBatchLike, row: VeprimRowLike) {
  if (batch.lloji === 'Transfer') {
    return row.lloji === 'Dalje' && row.shteti === batch.shteti
  }
  return row.lloji === batch.lloji && row.shteti === batch.shteti
}

export function isMirroredBatch(batch: VeprimBatchLike, rows: VeprimRowLike[]) {
  if (batch.lloji !== 'Dalje' || batch.shteti !== 'XK') return false
  const xkDalje = rows.filter((r) => r.lloji === 'Dalje' && r.shteti === 'XK')
  const alHyrje = rows.filter((r) => r.lloji === 'Hyrje' && r.shteti === 'AL')
  if (xkDalje.length === 0 || alHyrje.length !== xkDalje.length) return false
  const alCodes = new Set(alHyrje.map((r) => r.kodi_produktit))
  return xkDalje.every((r) => alCodes.has(r.kodi_produktit))
}

export function findSiblingRows(
  batch: VeprimBatchLike,
  rows: VeprimRowLike[],
  primary: VeprimRowLike,
) {
  if (batch.lloji === 'Transfer' || isMirroredBatch(batch, rows)) {
    return rows.filter(
      (r) => r.id !== primary.id && r.kodi_produktit === primary.kodi_produktit,
    )
  }
  return []
}
