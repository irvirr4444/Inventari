import { productLabel } from '@inventari/shared'

export type MatchedItem = {
  id: string
  productLabel: string
  shenim: string
}

export function shenimMatches(value: string | null | undefined, query: string): boolean {
  if (!query.trim()) return false
  if (!value?.trim()) return false
  return value.toLowerCase().includes(query.toLowerCase())
}

export function buildMatchedItems(
  rows: Array<{ id: string; kodi_produktit: string; shenim?: string | null }>,
  shenimQuery: string,
  namesByCode: Map<string, string>,
): MatchedItem[] {
  return rows
    .filter((row) => shenimMatches(row.shenim, shenimQuery))
    .map((row) => ({
      id: row.id,
      productLabel: productLabel(namesByCode.get(row.kodi_produktit), row.kodi_produktit),
      shenim: row.shenim!.trim(),
    }))
}
