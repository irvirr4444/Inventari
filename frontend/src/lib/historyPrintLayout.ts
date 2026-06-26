export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297
export const A4_MARGIN_MM = 14
export const PRINT_CARD_GAP_PX = 16

export function mmToPx(mm: number): number {
  return (mm * 96) / 25.4
}

/** Greedy pack measured item heights into A4 pages (indices into the source array). */
export function paginateByHeights(
  itemHeights: number[],
  firstPageCapacity: number,
  otherPageCapacity: number,
  gap: number,
): number[][] {
  if (itemHeights.length === 0) return [[]]

  const pages: number[][] = [[]]
  let pageIndex = 0
  let used = 0
  let capacity = firstPageCapacity

  for (let i = 0; i < itemHeights.length; i++) {
    const height = itemHeights[i]
    const gapBefore = pages[pageIndex].length > 0 ? gap : 0

    if (used + gapBefore + height > capacity && pages[pageIndex].length > 0) {
      pageIndex++
      pages.push([])
      used = 0
      capacity = otherPageCapacity
    }

    if (pages[pageIndex].length > 0) used += gap
    pages[pageIndex].push(i)
    used += height
  }

  return pages
}
