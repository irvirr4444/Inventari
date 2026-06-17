import type { SupabaseClient } from '@supabase/supabase-js'

type Country = 'XK' | 'AL'
type BatchLloji = 'Hyrje' | 'Dalje' | 'Transfer'

export type VeprimRow = {
  id: string
  batch_id: string | null
  lloji: 'Hyrje' | 'Dalje'
  data: string
  shteti: Country
  kodi_produktit: string
  cmimi_njesi: number | string
  sasia: number
  totali: number | string
  created_at: string
}

export type LegacyBatchKey = {
  data: string
  bucketSecond: string
  lloji: BatchLloji
  shteti: Country
  destination_shteti?: Country
}

export type LegacyBatch = {
  key: LegacyBatchKey
  id: string
  rows: VeprimRow[]
}

export const LEGACY_BATCH_PREFIX = 'legacy:'

type ListFilters = {
  lloji?: BatchLloji
  shteti?: Country
  dateFrom?: string
  dateTo?: string
}

function rowSecond(row: VeprimRow) {
  return row.created_at.slice(0, 19)
}

function productKey(row: VeprimRow) {
  return [row.kodi_produktit, String(row.cmimi_njesi), String(row.sasia)].join('|')
}

export function encodeLegacyBatchId(key: LegacyBatchKey) {
  return `${LEGACY_BATCH_PREFIX}${Buffer.from(JSON.stringify(key)).toString('base64url')}`
}

export function decodeLegacyBatchId(id: string): LegacyBatchKey | null {
  if (!id.startsWith(LEGACY_BATCH_PREFIX)) return null
  try {
    return JSON.parse(
      Buffer.from(id.slice(LEGACY_BATCH_PREFIX.length), 'base64url').toString('utf8'),
    ) as LegacyBatchKey
  } catch {
    return null
  }
}

export function isLegacyBatchId(id: string) {
  return id.startsWith(LEGACY_BATCH_PREFIX)
}

function matchesLegacyKey(row: VeprimRow, key: LegacyBatchKey) {
  if (row.data !== key.data || rowSecond(row) !== key.bucketSecond) return false

  if (key.lloji === 'Transfer') {
    return row.lloji === 'Dalje' && row.shteti === key.shteti
  }

  return row.lloji === key.lloji && row.shteti === key.shteti
}

export function groupLegacyVeprimRows(rows: VeprimRow[]): LegacyBatch[] {
  const byBucket = new Map<string, VeprimRow[]>()
  for (const row of rows) {
    const bucketKey = `${row.data}|${rowSecond(row)}`
    const list = byBucket.get(bucketKey) ?? []
    list.push(row)
    byBucket.set(bucketKey, list)
  }

  const batches: LegacyBatch[] = []
  const used = new Set<string>()

  for (const [bucketKey, bucketRows] of byBucket) {
    const [data, bucketSecond] = bucketKey.split('|')

    // Transfer pairs: Dalje in one country + Hyrje in another, same product/qty/price
    for (const out of bucketRows) {
      if (used.has(out.id) || out.lloji !== 'Dalje') continue
      const inn = bucketRows.find(
        (r) =>
          !used.has(r.id) &&
          r.lloji === 'Hyrje' &&
          r.shteti !== out.shteti &&
          productKey(r) === productKey(out),
      )
      if (!inn) continue

      const transferRows: VeprimRow[] = []
      const transferOuts = bucketRows.filter(
        (r) => !used.has(r.id) && r.lloji === 'Dalje' && r.shteti === out.shteti,
      )

      for (const o of transferOuts) {
        const i = bucketRows.find(
          (r) =>
            !used.has(r.id) &&
            r.lloji === 'Hyrje' &&
            r.shteti === inn.shteti &&
            productKey(r) === productKey(o),
        )
        if (!i) continue
        used.add(o.id)
        used.add(i.id)
        transferRows.push(o, i)
      }

      if (transferRows.length === 0) continue

      const key: LegacyBatchKey = {
        data,
        bucketSecond,
        lloji: 'Transfer',
        shteti: out.shteti,
        destination_shteti: inn.shteti,
      }
      batches.push({ key, id: encodeLegacyBatchId(key), rows: transferRows })
    }

    // Remaining rows: one batch per (lloji, shteti)
    const groups = new Map<string, VeprimRow[]>()
    for (const row of bucketRows) {
      if (used.has(row.id)) continue
      const gk = `${row.lloji}|${row.shteti}`
      const list = groups.get(gk) ?? []
      list.push(row)
      groups.set(gk, list)
    }

    for (const [gk, groupRows] of groups) {
      const [lloji, shteti] = gk.split('|') as ['Hyrje' | 'Dalje', Country]
      const key: LegacyBatchKey = { data, bucketSecond, lloji, shteti }
      batches.push({ key, id: encodeLegacyBatchId(key), rows: groupRows })
    }
  }

  return batches
}

function legacyBatchMeta(batch: LegacyBatch) {
  const displayRows =
    batch.key.lloji === 'Transfer'
      ? batch.rows.filter((r) => r.lloji === 'Dalje' && r.shteti === batch.key.shteti)
      : batch.rows.filter(
          (r) => r.lloji === batch.key.lloji && r.shteti === batch.key.shteti,
        )

  const totali = displayRows.reduce((sum, r) => sum + Number(r.totali ?? 0), 0)
  const created_at = batch.rows.reduce(
    (max, r) => (r.created_at > max ? r.created_at : max),
    batch.rows[0]?.created_at ?? new Date().toISOString(),
  )

  return {
    id: batch.id,
    lloji: batch.key.lloji,
    shteti: batch.key.shteti,
    destination_shteti: batch.key.destination_shteti,
    data: batch.key.data,
    totali,
    created_at,
    item_count: displayRows.length,
  }
}

function matchesFilters(
  batch: ReturnType<typeof legacyBatchMeta>,
  filters: ListFilters,
) {
  if (filters.lloji && batch.lloji !== filters.lloji) return false
  if (filters.shteti && batch.shteti !== filters.shteti) return false
  if (filters.dateFrom && batch.data < filters.dateFrom) return false
  if (filters.dateTo && batch.data > filters.dateTo) return false
  return true
}

export async function fetchLegacyActionBatches(
  supabase: SupabaseClient,
  filters: ListFilters,
) {
  let q = supabase
    .from('veprimi')
    .select('*')
    .is('batch_id', null)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.dateFrom) q = q.gte('data', filters.dateFrom)
  if (filters.dateTo) q = q.lte('data', filters.dateTo)
  if (filters.shteti) q = q.eq('shteti', filters.shteti)
  if (filters.lloji && filters.lloji !== 'Transfer') q = q.eq('lloji', filters.lloji)

  const { data, error } = await q
  if (error) {
    if (error.message.includes('batch_id') || error.code === '42703') return []
    throw error
  }

  let grouped = groupLegacyVeprimRows((data ?? []) as VeprimRow[])
  if (filters.lloji === 'Transfer') {
    grouped = grouped.filter((b) => b.key.lloji === 'Transfer')
  }

  return grouped.map(legacyBatchMeta).filter((b) => matchesFilters(b, filters))
}

export async function loadLegacyBatchDetail(supabase: SupabaseClient, id: string) {
  const key = decodeLegacyBatchId(id)
  if (!key) return { error: 'Veprimi nuk u gjet.' as const }

  const { data, error } = await supabase
    .from('veprimi')
    .select('*')
    .is('batch_id', null)
    .eq('data', key.data)

  if (error) return { error: error.message }

  const rows = ((data ?? []) as VeprimRow[]).filter((row) => matchesLegacyKey(row, key))
  if (rows.length === 0) return { error: 'Veprimi nuk u gjet.' as const }

  const batch = legacyBatchMeta({ key, id, rows })

  const displayRows =
    key.lloji === 'Transfer'
      ? rows.filter((r) => r.lloji === 'Dalje' && r.shteti === key.shteti)
      : rows.filter((r) => r.lloji === key.lloji && r.shteti === key.shteti)

  const productCodes = [...new Set(displayRows.map((r) => r.kodi_produktit))]
  const { data: products, error: productsError } = await supabase
    .from('produkti')
    .select('kodi,emri')
    .in('kodi', productCodes)

  if (productsError) return { error: productsError.message }

  const namesByCode = new Map((products ?? []).map((p) => [p.kodi, p.emri]))

  const mirrored =
    key.lloji === 'Dalje' &&
    key.shteti === 'XK' &&
    rows.some((r) => r.lloji === 'Hyrje' && r.shteti === 'AL')

  return {
    ...batch,
    items: displayRows.map((row) => ({
      id: row.id,
      kodi_produktit: row.kodi_produktit,
      emri_produktit: namesByCode.get(row.kodi_produktit) ?? row.kodi_produktit,
      cmimi_njesi: Number(row.cmimi_njesi),
      sasia: Number(row.sasia),
      totali: Number(row.totali),
    })),
    mirrored_to_albania: mirrored,
  }
}

export function mergeAndPaginateActions<T extends { data: string; created_at: string; id: string }>(
  all: T[],
  page: number,
  limit: number,
) {
  const seen = new Set<string>()
  const unique = all.filter((a) => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })

  const sorted = unique.sort((a, b) => {
    const dateDiff = b.data.localeCompare(a.data)
    if (dateDiff !== 0) return dateDiff
    return b.created_at.localeCompare(a.created_at)
  })

  const total = sorted.length
  const from = (page - 1) * limit
  return { actions: sorted.slice(from, from + limit), total }
}

async function loadRowsForLegacyKey(supabase: SupabaseClient, key: LegacyBatchKey) {
  const { data, error } = await supabase
    .from('veprimi')
    .select('*')
    .is('batch_id', null)
    .eq('data', key.data)

  if (error) return { error: error.message as string }

  const bucketRows = ((data ?? []) as VeprimRow[]).filter(
    (row) => rowSecond(row) === key.bucketSecond,
  )
  const batches = groupLegacyVeprimRows(bucketRows)
  const batch = batches.find(
    (b) =>
      b.key.lloji === key.lloji &&
      b.key.shteti === key.shteti &&
      b.key.bucketSecond === key.bucketSecond &&
      b.key.data === key.data &&
      b.key.destination_shteti === key.destination_shteti,
  )

  if (!batch) return { error: 'Veprimi nuk u gjet.' as const }
  return { batch, bucketRows }
}

export async function resolveLegacyBatch(supabase: SupabaseClient, id: string) {
  const key = decodeLegacyBatchId(id)
  if (!key) return { error: 'Veprimi nuk u gjet.' as const }
  return loadRowsForLegacyKey(supabase, key)
}

function findLegacySiblingRows(
  batch: LegacyBatch,
  bucketRows: VeprimRow[],
  primary: VeprimRow,
) {
  if (batch.key.lloji === 'Transfer') {
    return batch.rows.filter(
      (r) => r.id !== primary.id && r.kodi_produktit === primary.kodi_produktit,
    )
  }

  if (batch.key.lloji === 'Dalje' && batch.key.shteti === 'XK') {
    return bucketRows.filter(
      (r) =>
        r.id !== primary.id &&
        r.lloji === 'Hyrje' &&
        r.shteti === 'AL' &&
        r.kodi_produktit === primary.kodi_produktit,
    )
  }

  return []
}

function isLegacyDisplayRow(batch: LegacyBatch, row: VeprimRow) {
  if (batch.key.lloji === 'Transfer') {
    return row.lloji === 'Dalje' && row.shteti === batch.key.shteti
  }
  return row.lloji === batch.key.lloji && row.shteti === batch.key.shteti
}

export async function deleteLegacyBatch(supabase: SupabaseClient, id: string) {
  const resolved = await resolveLegacyBatch(supabase, id)
  if ('error' in resolved) return resolved

  const ids = resolved.batch.rows.map((r) => r.id)
  const { error } = await supabase.from('veprimi').delete().in('id', ids)
  if (error) return { error: error.message }
  return { ok: true as const }
}

export async function updateLegacyBatch(
  supabase: SupabaseClient,
  id: string,
  body: {
    data?: string
    shteti?: Country
    destination_shteti?: Country
  },
) {
  const resolved = await resolveLegacyBatch(supabase, id)
  if ('error' in resolved) return resolved

  const { batch, bucketRows } = resolved
  const mirrored =
    batch.key.lloji === 'Dalje' &&
    batch.key.shteti === 'XK' &&
    bucketRows.some((r) => r.lloji === 'Hyrje' && r.shteti === 'AL')

  if (mirrored && (body.shteti || body.destination_shteti)) {
    return { error: 'Nuk mund te ndryshohet shteti per Dalje te pasqyruar ne Shqiperi.' as const }
  }

  const nextShteti = body.shteti ?? batch.key.shteti
  const nextDest =
    batch.key.lloji === 'Transfer'
      ? body.destination_shteti ?? batch.key.destination_shteti
      : batch.key.destination_shteti

  if (batch.key.lloji === 'Transfer') {
    if (!nextDest) return { error: 'Transfer kerkon destinacion.' as const }
    if (nextDest === nextShteti) {
      return { error: 'Destinacioni i transferit duhet te jete ndryshe nga burimi.' as const }
    }
  }

  const rowsToUpdate = new Map<string, VeprimRow>()
  for (const row of batch.rows) rowsToUpdate.set(row.id, row)
  for (const row of batch.rows) {
    for (const sibling of findLegacySiblingRows(batch, bucketRows, row)) {
      rowsToUpdate.set(sibling.id, sibling)
    }
  }

  for (const row of rowsToUpdate.values()) {
    const patch: Record<string, unknown> = {}
    if (body.data) patch.data = body.data

    if (batch.key.lloji === 'Transfer' && (body.shteti || body.destination_shteti)) {
      if (row.lloji === 'Dalje') patch.shteti = nextShteti
      else if (row.lloji === 'Hyrje') patch.shteti = nextDest
    } else if (body.shteti && batch.key.lloji !== 'Transfer') {
      patch.shteti = nextShteti
    }

    if (Object.keys(patch).length === 0) continue

    const { error } = await supabase.from('veprimi').update(patch).eq('id', row.id)
    if (error) return { error: error.message }
  }

  return { ok: true as const }
}

export async function updateLegacyBatchItem(
  supabase: SupabaseClient,
  batchId: string,
  itemId: string,
  body: {
    kodi_produktit?: string
    cmimi_njesi?: number
    sasia?: number
  },
) {
  const resolved = await resolveLegacyBatch(supabase, batchId)
  if ('error' in resolved) return resolved

  const { batch, bucketRows } = resolved
  const primary = batch.rows.find((r) => r.id === itemId)
  if (!primary || !isLegacyDisplayRow(batch, primary)) {
    return { error: 'Rreshti i produktit nuk u gjet.' as const }
  }

  const nextKodi = body.kodi_produktit ?? primary.kodi_produktit
  const nextCmimi = body.cmimi_njesi ?? Number(primary.cmimi_njesi)
  const nextSasia = body.sasia ?? Number(primary.sasia)

  const displayRows = batch.rows.filter((r) => isLegacyDisplayRow(batch, r))
  const duplicate = displayRows.some(
    (r) => r.id !== primary.id && r.kodi_produktit === nextKodi,
  )
  if (duplicate) return { error: 'Produkti ekziston tashme ne kete veprim.' as const }

  const targets = [primary, ...findLegacySiblingRows(batch, bucketRows, primary)]
  for (const row of targets) {
    const patch: Record<string, unknown> = {
      cmimi_njesi: nextCmimi,
      sasia: nextSasia,
    }
    if (body.kodi_produktit) patch.kodi_produktit = nextKodi

    const { error } = await supabase.from('veprimi').update(patch).eq('id', row.id)
    if (error) return { error: error.message }
  }

  return { ok: true as const }
}
