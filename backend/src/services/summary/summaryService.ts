import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildGroupedSummaryRows,
  buildSummaryByCountry,
  resolveActionCreatorUserId,
  type GroupedSummaryResult,
  type SummaryByCountry,
  type SummaryGroupBy,
} from '@inventari/shared'
import type { SessionUser } from '../../domain/user.js'
import { AppError } from '../../errors.js'
import { listLokacionetByOwner } from '../../repositories/lokacioniRepository.js'
import { listPerdoruesByAccount } from '../../repositories/perdoruesRepository.js'
import { listProduktet } from '../../repositories/produktiRepository.js'
import {
  listVeprimetForAnalytics,
  listVeprimetForGroupedSummary,
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

export async function getDynamicGroupedSummary(
  supabase: SupabaseClient,
  user: SessionUser,
  query: { from: string; to: string; groupBy: SummaryGroupBy },
): Promise<GroupedSummaryResult> {
  const tenantId = tenantIdFor(user)
  const [lokacionet, products, users, rows] = await Promise.all([
    listLokacionetByOwner(supabase, tenantId),
    listProduktet(supabase, tenantId, {}),
    listPerdoruesByAccount(supabase, tenantId),
    listVeprimetForGroupedSummary(supabase, tenantId, query),
  ])

  let summaryLokacionet = lokacionet.filter((l) => l.show_in_summary)
  if (!isAdmin(user)) {
    const allowed = new Set(listAllowedLocationIds(user, 'view'))
    summaryLokacionet = summaryLokacionet.filter((l) => allowed.has(l.id))
  }

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

  const groupedRows = buildGroupedSummaryRows(query.groupBy, {
    locationRows,
    productRows,
    userRows,
    locationIds: summaryLokacionet.map((l) => l.id),
    locations: summaryLokacionet.map((l) => ({ id: l.id, emri: l.emri })),
    products: products.map((p) => ({ kodi: p.kodi, emri: p.emri })),
    users: users.map((u) => ({ id: u.id, emri: u.emri, email: u.email })),
  })

  return {
    groupBy: query.groupBy,
    rows: groupedRows,
  }
}

export async function requireSummaryAccess(user: SessionUser): Promise<void> {
  if (!isAdmin(user) && !highestAccessInAnyLocation(user, 'view')) {
    throw new AppError(403, 'No location access')
  }
}
