import { normalizeOraInput } from '@inventari/shared'

export const TIME_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
export const TIME_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
export const TIME_PICKER_LOOP_COUNT = 5

export type PickerLoopItem = { value: string; loopIndex: number }

export const TIME_QUICK_PICKS = [
  { id: 'now', label: 'Tani', value: null as string | null },
  { id: '09', label: '09:00', value: '09:00' },
  { id: '12', label: '12:00', value: '12:00' },
  { id: '17', label: '17:00', value: '17:00' },
] as const

export function currentOraValue(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function parseOraParts(value: string): { hour: string; minute: string } {
  const normalized = normalizeOraInput(value)
  if (normalized) {
    const [hour, minute] = normalized.split(':')
    return { hour, minute }
  }
  const [hour, minute] = currentOraValue().split(':')
  return { hour, minute }
}

export function combineOraParts(hour: string, minute: string): string {
  return `${hour}:${minute}`
}

export function parseOraDigits(value: string): [string, string, string, string] {
  const normalized = normalizeOraInput(value)
  if (!normalized) return ['', '', '', '']
  return [normalized[0], normalized[1], normalized[3], normalized[4]]
}

/** Value whose row is closest to the vertical center of a scrollable picker column. */
function getCenteredListItem(list: HTMLElement): HTMLElement | null {
  const listRect = list.getBoundingClientRect()
  const centerY = listRect.top + listRect.height / 2
  let bestItem: HTMLElement | null = null
  let bestDist = Infinity

  for (const item of list.querySelectorAll<HTMLElement>('[data-loop-index]')) {
    const itemRect = item.getBoundingClientRect()
    const itemCenter = itemRect.top + itemRect.height / 2
    const dist = Math.abs(itemCenter - centerY)
    if (dist < bestDist) {
      bestDist = dist
      bestItem = item
    }
  }

  return bestItem
}

export function buildLoopedPickerItems(
  values: readonly string[],
  loopCount = TIME_PICKER_LOOP_COUNT,
): PickerLoopItem[] {
  const items: PickerLoopItem[] = []
  for (let loop = 0; loop < loopCount; loop++) {
    for (let i = 0; i < values.length; i++) {
      items.push({ value: values[i], loopIndex: loop * values.length + i })
    }
  }
  return items
}

export function loopPickerMiddleOffset(
  valueCount: number,
  loopCount = TIME_PICKER_LOOP_COUNT,
): number {
  return valueCount * Math.floor(loopCount / 2)
}

export function valueIndexInPicker(values: readonly string[], value: string): number {
  const idx = values.indexOf(value)
  return idx >= 0 ? idx : 0
}

export function getCenteredListIndex(list: HTMLElement): number | null {
  const item = getCenteredListItem(list)
  if (!item?.dataset.loopIndex) return null
  const idx = Number(item.dataset.loopIndex)
  return Number.isFinite(idx) ? idx : null
}

export function getCenteredListValue(list: HTMLElement): string | null {
  const item = getCenteredListItem(list)
  return item?.dataset.value ?? null
}

export function scrollPickerToLoopIndex(list: HTMLElement, loopIndex: number): void {
  const item = list.querySelector<HTMLElement>(`[data-loop-index="${loopIndex}"]`)
  if (!item) return
  item.scrollIntoView({ block: 'center', behavior: 'auto' })
}

/** Jump back to the middle loop copy so the wheel can keep scrolling in either direction. */
export function maybeRecenterLoopedPicker(
  list: HTMLElement,
  valueCount: number,
  loopCount = TIME_PICKER_LOOP_COUNT,
): boolean {
  const idx = getCenteredListIndex(list)
  if (idx === null) return false

  const middleLoop = Math.floor(loopCount / 2)
  const loop = Math.floor(idx / valueCount)
  if (loop === middleLoop) return false

  const valueIdx = idx % valueCount
  const target = loopPickerMiddleOffset(valueCount, loopCount) + valueIdx
  if (target === idx) return false

  scrollPickerToLoopIndex(list, target)
  return true
}
