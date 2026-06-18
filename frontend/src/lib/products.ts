import type { Produkti } from '../lib/api'
import { sortProductsByKodi } from '../lib/format'

export function filterProductsByQuery<T extends { kodi: string; emri: string }>(
  products: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return products
  return products.filter(
    (p) => p.kodi.toLowerCase().includes(q) || p.emri.toLowerCase().includes(q),
  )
}

export function sortAndFilterProducts(products: Produkti[], query: string): Produkti[] {
  return filterProductsByQuery(sortProductsByKodi(products), query)
}
