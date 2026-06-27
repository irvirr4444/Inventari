import {
  ALL_FILTER_VALUE_LABEL,
  SOME_FILTER_VALUE_LABEL,
} from '../mobile/constants/historiFilters'

export const HISTORI_LLOJET = ['Hyrje', 'Dalje', 'Transfer'] as const
export type HistoriLloji = (typeof HISTORI_LLOJET)[number]

export function normalizeHistoriLocationIds(
  selectedIds: string[],
  allLocationIds: string[],
): string[] {
  if (selectedIds.length === 0) return []
  if (
    allLocationIds.length > 0 &&
    allLocationIds.every((id) => selectedIds.includes(id))
  ) {
    return []
  }
  return selectedIds
}

export function toggleHistoriLocationId(
  selectedIds: string[],
  id: string,
  allLocationIds: string[],
): string[] {
  const next = selectedIds.includes(id)
    ? selectedIds.filter((x) => x !== id)
    : [...selectedIds, id]
  return normalizeHistoriLocationIds(next, allLocationIds)
}

export function resolveHistoriLocationFilterLabel(
  selectedIds: string[],
  locations: { id: string; emri: string }[],
): string {
  const total = locations.length
  const count = selectedIds.length
  if (count === 0 || (total > 0 && count >= total)) return ALL_FILTER_VALUE_LABEL
  if (count === 1) {
    return locations.find((l) => l.id === selectedIds[0])?.emri ?? ALL_FILTER_VALUE_LABEL
  }
  return SOME_FILTER_VALUE_LABEL
}

export function normalizeHistoriLlojet(selected: HistoriLloji[]): HistoriLloji[] {
  if (selected.length === 0) return []
  if (HISTORI_LLOJET.every((lloji) => selected.includes(lloji))) return []
  return selected
}

export function toggleHistoriLloji(selected: HistoriLloji[], lloji: HistoriLloji): HistoriLloji[] {
  const next = selected.includes(lloji)
    ? selected.filter((x) => x !== lloji)
    : [...selected, lloji]
  return normalizeHistoriLlojet(next)
}

export function resolveHistoriLlojiFilterLabel(selected: HistoriLloji[]): string {
  const count = selected.length
  if (count === 0 || count >= HISTORI_LLOJET.length) return ALL_FILTER_VALUE_LABEL
  if (count === 1) return selected[0]
  return SOME_FILTER_VALUE_LABEL
}

export function resolveHistoriLocationExportLabel(
  selectedIds: string[],
  locations: { id: string; emri: string }[],
): string | undefined {
  if (selectedIds.length === 0) return undefined
  const names = selectedIds
    .map((id) => locations.find((l) => l.id === id)?.emri ?? id)
    .filter(Boolean)
  if (names.length === 0) return undefined
  if (names.length === 1) return names[0]
  return names.join(', ')
}
