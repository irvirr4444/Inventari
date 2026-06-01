import type { Country } from './country'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return (await res.json()) as T
  return (await res.text()) as T
}

export type Produkti = {
  id: string
  kodi: string
  emri: string
  pershkrimi: string | null
  gjendje_kosove: number
  gjendje_shqiperi: number
  created_at?: string
  updated_at?: string
}

export type Veprimi = {
  id: string
  lloji: 'Hyrje' | 'Dalje'
  data: string
  shteti: Country
  kodi_produktit: string
  cmimi_njesi: number
  sasia: number
  totali?: number
  created_at?: string
}

export async function listProducts(opts: {
  search?: string
}): Promise<Produkti[]> {
  const qs = new URLSearchParams()
  if (opts.search) qs.set('search', opts.search)
  const res = await http<{ data: Produkti[] }>(`/products?${qs.toString()}`)
  return res.data
}

export async function createProduct(input: {
  kodi: string
  emri: string
  pershkrimi?: string
  gjendje_kosove?: number
  gjendje_shqiperi?: number
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
    pershkrimi?: string | null
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

export async function deleteProduct(id: string): Promise<void> {
  await http<{ ok: true }>(`/products/${id}`, {
    method: 'DELETE',
  })
}

export async function createActionBatch(input: {
  shteti: Country
  lloji: 'Hyrje' | 'Dalje'
  data?: string
  items: Array<{ kodi_produktit: string; cmimi_njesi: number; sasia: number }>
}): Promise<Veprimi[]> {
  const res = await http<{ data: Veprimi[] }>(`/actions`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function listActions(opts: {
  shteti?: Country
  from?: string
  to?: string
  lloji?: 'Hyrje' | 'Dalje'
  limit?: number
}): Promise<Veprimi[]> {
  const qs = new URLSearchParams()
  if (opts.shteti) qs.set('shteti', opts.shteti)
  if (opts.from) qs.set('from', opts.from)
  if (opts.to) qs.set('to', opts.to)
  if (opts.lloji) qs.set('lloji', opts.lloji)
  if (opts.limit) qs.set('limit', String(opts.limit))
  const res = await http<{ data: Veprimi[] }>(`/actions?${qs.toString()}`)
  return res.data
}

export async function analyticsStock(shteti: Country): Promise<Produkti[]> {
  const qs = new URLSearchParams({ shteti })
  const res = await http<{
    data: Array<{ id: string; kodi: string; emri: string; pershkrimi: string | null; gjendje: number }>
  }>(`/analytics/stock?${qs.toString()}`)
  // Map into Produkti-like objects with the requested country in `gjendje_*` for convenience
  return res.data.map((p) => ({
    id: p.id,
    kodi: p.kodi,
    emri: p.emri,
    pershkrimi: p.pershkrimi,
    gjendje_kosove: shteti === 'XK' ? p.gjendje : 0,
    gjendje_shqiperi: shteti === 'AL' ? p.gjendje : 0,
  }))
}

export async function analyticsSummary(opts: {
  shteti: Country
  from: string
  to: string
}): Promise<{ in_qty: number; in_value: number; out_qty: number; out_value: number }> {
  const qs = new URLSearchParams(opts)
  const res = await http<{
    data: { in_qty: number; in_value: number; out_qty: number; out_value: number }
  }>(`/analytics/summary?${qs.toString()}`)
  return res.data
}

export function exportUrl(
  format: 'csv' | 'xlsx',
  opts: { shteti?: Country; from?: string; to?: string; lloji?: 'Hyrje' | 'Dalje' },
) {
  const qs = new URLSearchParams()
  if (opts.shteti) qs.set('shteti', opts.shteti)
  if (opts.from) qs.set('from', opts.from)
  if (opts.to) qs.set('to', opts.to)
  if (opts.lloji) qs.set('lloji', opts.lloji)
  return `${API_BASE}/exports/actions.${format}?${qs.toString()}`
}

