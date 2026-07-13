import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SummaryGroupBySchema } from '@inventari/shared'
import { z } from 'zod'
import { parseOrThrow } from '../errors.js'
import {
  getDynamicGroupedSummary,
  getLegacySummary,
  requireSummaryAccess,
} from '../services/summary/index.js'

export function registerAnalyticsRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get('/api/analytics/stock', async (req) => {
    await requireSummaryAccess(req.user)

    const query = parseOrThrow(
      z.object({ shteti: z.enum(['XK', 'AL']) }),
      (req.query ?? {}) as Record<string, unknown>,
    )

    const { listProduktet } = await import('../repositories/produktiRepository.js')
    const { tenantIdFor } = await import('../services/access/index.js')
    const rows = await listProduktet(supabase, tenantIdFor(req.user), {})
    const mapped = rows.map((p) => ({
      id: p.id,
      kodi: p.kodi,
      emri: p.emri,
      gjendje:
        query.shteti === 'XK'
          ? Number(p.gjendje_kosove ?? 0)
          : Number(p.gjendje_shqiperi ?? 0),
    }))
    return { data: mapped }
  })

  app.get('/api/analytics/summary', async (req) => {
    await requireSummaryAccess(req.user)

    const query = parseOrThrow(
      z.object({
        from: z.string(),
        to: z.string(),
        groupBy: SummaryGroupBySchema.optional().default('location'),
      }),
      (req.query ?? {}) as Record<string, unknown>,
    )

    if (req.user.isLegacy) {
      return {
        data: await getLegacySummary(supabase, req.user, {
          from: query.from,
          to: query.to,
        }),
      }
    }

    return {
      data: await getDynamicGroupedSummary(supabase, req.user, query),
    }
  })
}
