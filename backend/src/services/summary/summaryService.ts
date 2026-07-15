import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildGroupedSummaryRows,
  buildSummaryByCountry,
  productLabel,
  resolveActionCreatorUserId,
  type GroupedSummaryResult,
  type GroupedSummaryRow,
  type SummaryByCountry,
  type SummaryGroupBy,
} from '@inventari/shared'
import type { SessionUser } from '../../domain/user.js'
import { AppError } from '../../errors.js'
import { listLokacionetByOwner } from '../../repositories/lokacioniRepository.js'
import { listPerdoruesByAccount } from '../../repositories/perdoruesRepository.js'
import { listProduktet } from '../../repositories/produktiRepository.js'
import {
  fetchSummaryAggregates,
  listVeprimetForAnalytics,
  listVeprimetForGroupedSummary,
  type SummaryAggregateRow,
} from '../../repositories/veprimiRepository.js'
import {
  highestAccessInAnyLocation,
  isAdmin,
  listAllowedLocationIds,
  tenantIdFor,
} from '../access/index.js'

function resolveBatchCreator(
  row: {
    batch_id: string | null
    veprim_batch: { created_by_user_id: string | null } | { created_by_user_id: string | null }[] | null
  },
  accountOwnerId: string,
): string {
  return resolveActionCreatorUserId(row, accountOwnerId)
}

function filterRowsByLocationAccess<T extends { lokacioni_id: string | null }>(
  user: SessionUser,
  rows: T[],
  allowedIds: Set<string>,
): T[] {
  if (isAdmin(user)) return rows
  return rows.filter((row) => row.lokacioni_id && allowedIds.has(row.lokacioni_id))
}

function emptySummary(): Omit<GroupedSummaryRow, 'id' | 'label'> {
  return { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 }
}

function mapAggregatesToGroupedRows(
  groupBy: SummaryGroupBy,
  aggregates: SummaryAggregateRow[],
  opts: {
    summaryLokacionet: Array<{ id: string; emri: string }>
    products: Array<{ kodi: string; emri: string }>
    users: Array<{ id: string; emri: string | null; email: string | null }>
    allowedIds: Set<string>
  },
): GroupedSummaryRow[] {
  const byId = new Map(aggregates.map((row) => [row.group_id, row]))

  if (groupBy === 'location') {
    return opts.summaryLokacionet.map((loc) => {
      const agg = byId.get(loc.id)
      return {
        id: loc.id,
        label: loc.emri,
        ...(agg
          ? {
              in_qty: agg.in_qty,
              in_value: agg.in_value,
              out_qty: agg.out_qty,
              out_value: agg.out_value,
            }
          : emptySummary()),
      }
    })
  }

  if (groupBy === 'product') {
    const labels = new Map(opts.products.map((p) => [p.kodi, productLabel(p.emri, p.kodi)]))
    return [...byId.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base', numeric: true }))
      .map(([id, agg]) => ({
        id,
        label: labels.get(id) ?? id,
        in_qty: agg.in_qty,
        in_value: agg.in_value,
        out_qty: agg.out_qty,
        out_value: agg.out_value,
      }))
  }

  const labels = new Map(
    opts.users.map((u) => [u.id, u.emri?.trim() || u.email?.trim() || u.id]),
  )
  return [...byId.entries()]
    .sort((a, b) =>
      (labels.get(a[0]) ?? a[0]).localeCompare(labels.get(b[0]) ?? b[0], undefined, {
        sensitivity: 'base',
        numeric: true,
      }),
    )
    .map(([id, agg]) => ({
      id,
      label: labels.get(id) ?? id,
      in_qty: agg.in_qty,
      in_value: agg.in_value,
      out_qty: agg.out_qty,
      out_value: agg.out_value,
    }))
}

export async function getLegacySummary(
  supabase: SupabaseClient,
  user: SessionUser,
  query: { from: string; to: string },
): Promise<SummaryByCountry> {
  const rows = await listVeprimetForAnalytics(supabase, tenantIdFor(user), query)
  return buildSummaryByCountry(
    rows.map((r) => ({
      lloji: r.lloji as 'Hyrje' | 'Dalje',
      shteti: r.shteti,
      sasia: r.sasia,
      totali: r.totali,
    })),
  )
}

async function getDynamicGroupedSummaryFromRows(
  supabase: SupabaseClient,
  user: SessionUser,
  tenantId: string,
  query: { from: string; to: string; groupBy: SummaryGroupBy },
  summaryLokacionet: Array<{ id: string; emri: string }>,
  products: Array<{ kodi: string; emri: string }>,
  users: Array<{ id: string; emri: string | null; email: string | null }>,
): Promise<GroupedSummaryResult> {
  const rows = await listVeprimetForGroupedSummary(supabase, tenantId, query)
  const allowedIds = new Set(summaryLokacionet.map((l) => l.id))
  const filteredRows = filterRowsByLocationAccess(user, rows, allowedIds)

  const locationRows = filteredRows
    .filter((r) => r.lokacioni_id && allowedIds.has(r.lokacioni_id))
    .map((r) => ({
      lloji: r.lloji,
      lokacioni_id: r.lokacioni_id!,
      sasia: r.sasia,
      totali: r.totali,
    }))

  const productRows = filteredRows.map((r) => ({
    lloji: r.lloji,
    kodi_produktit: r.kodi_produktit,
    sasia: r.sasia,
    totali: r.totali,
  }))

  const userRows = filteredRows.map((r) => ({
    lloji: r.lloji,
    created_by_user_id: resolveBatchCreator(r, tenantId),
    sasia: r.sasia,
    totali: r.totali,
  }))

  return {
    groupBy: query.groupBy,
    rows: buildGroupedSummaryRows(query.groupBy, {
      locationRows,
      productRows,
      userRows,
      locationIds: summaryLokacionet.map((l) => l.id),
      locations: summaryLokacionet.map((l) => ({ id: l.id, emri: l.emri })),
      products,
      users,
    }),
  }
}

export async function getDynamicGroupedSummary(
  supabase: SupabaseClient,
  user: SessionUser,
  query: { from: string; to: string; groupBy: SummaryGroupBy },
): Promise<GroupedSummaryResult> {
  const tenantId = tenantIdFor(user)
  const [lokacionet, products, users] = await Promise.all([
    listLokacionetByOwner(supabase, tenantId),
    listProduktet(supabase, tenantId, {}),
    listPerdoruesByAccount(supabase, tenantId),
  ])

  let summaryLokacionet = lokacionet.filter((l) => l.show_in_summary)
  if (!isAdmin(user)) {
    const allowed = new Set(listAllowedLocationIds(user, 'view'))
    summaryLokacionet = summaryLokacionet.filter((l) => allowed.has(l.id))
  }

  const allowedIds = new Set(summaryLokacionet.map((l) => l.id))
  const productCatalog = products.map((p) => ({ kodi: p.kodi, emri: p.emri }))
  const userCatalog = users.map((u) => ({ id: u.id, emri: u.emri, email: u.email }))

  const aggregates = await fetchSummaryAggregates(supabase, tenantId, {
    from: query.from,
    to: query.to,
    groupBy: query.groupBy,
  })

  if (aggregates) {
    const scoped =
      query.groupBy === 'location'
        ? aggregates.filter((row) => allowedIds.has(row.group_id))
        : aggregates

    return {
      groupBy: query.groupBy,
      rows: mapAggregatesToGroupedRows(query.groupBy, scoped, {
        summaryLokacionet: summaryLokacionet.map((l) => ({ id: l.id, emri: l.emri })),
        products: productCatalog,
        users: userCatalog,
        allowedIds,
      }),
    }
  }

  return getDynamicGroupedSummaryFromRows(
    supabase,
    user,
    tenantId,
    query,
    summaryLokacionet.map((l) => ({ id: l.id, emri: l.emri })),
    productCatalog,
    userCatalog,
  )
}

export async function requireSummaryAccess(user: SessionUser): Promise<void> {
  if (!isAdmin(user) && !highestAccessInAnyLocation(user, 'view')) {
    throw new AppError(403, 'No location access')
  }
}
