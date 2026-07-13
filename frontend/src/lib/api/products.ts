import { http } from './http'

export type Produkti = {
  id: string
  kodi: string
  emri: string
  gjendje_kosove: number
  gjendje_shqiperi: number
  created_at?: string
  updated_at?: string
}

export type ProductListItem = {
  id: string
  kodi: string
  emri: string
}

export type DynamicProdukti = ProductListItem & {
  njesi_matese?: string | null
  stock: Array<{ lokacioni_id: string; sasia: number }>
  created_at?: string
  updated_at?: string
}

export function stockRecord(product: DynamicProdukti): Record<string, number> {
  return Object.fromEntries(product.stock.map((s) => [s.lokacioni_id, s.sasia]))
}

export async function listProducts(opts: {
  search?: string
}): Promise<Produkti[]> {
  const qs = new URLSearchParams()
  if (opts.search) qs.set('search', opts.search)
  const res = await http<{ data: Produkti[] }>(`/products?${qs.toString()}`)
  return res.data
}

export async function listDynamicProducts(opts: {
  search?: string
}): Promise<DynamicProdukti[]> {
  const qs = new URLSearchParams()
  if (opts.search) qs.set('search', opts.search)
  const res = await http<{ data: DynamicProdukti[] }>(`/products?${qs.toString()}`)
  return res.data
}

export async function createProduct(input: {
  kodi: string
  emri: string
  gjendje_kosove?: number
  gjendje_shqiperi?: number
  njesi_matese?: string | null
}): Promise<Produkti> {
  const res = await http<{ data: Produkti }>(`/products`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateProduct(
  id: string,
  patch: {
    kodi?: string
    emri?: string
    gjendje_kosove?: number
    gjendje_shqiperi?: number
  },
): Promise<Produkti> {
  const res = await http<{ data: Produkti }>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return res.data
}

export async function updateDynamicProduct(
  id: string,
  patch: {
    kodi?: string
    emri?: string
    njesi_matese?: string | null
    stock?: Array<{ lokacioni_id: string; sasia: number }>
  },
): Promise<DynamicProdukti> {
  const res = await http<{ data: DynamicProdukti }>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return res.data
}

export async function deleteProduct(id: string): Promise<void> {
  await http<{ ok: true }>(`/products/${id}`, {
    method: 'DELETE',
  })
}
