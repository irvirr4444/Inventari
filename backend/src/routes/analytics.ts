import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildSummaryByCountry,
  buildSummaryByLocation,
  CountrySchema,
} from '@inventari/shared'
import { z } from 'zod'
import { AppError, parseOrThrow } from '../errors.js'
import { listProduktet } from '../repositories/produktiRepository.js'
import { listVeprimetForAnalytics } from '../repositories/veprimiRepository.js'
import { listLokacionetByOwner } from '../repositories/lokacioniRepository.js'

export function registerAnalyticsRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get('/api/analytics/stock', async (req) => {
    const query = parseOrThrow(
      z.object({ shteti: CountrySchema }),
      (req.query ?? {}) as Record<string, unknown>,
    )

    const rows = await listProduktet(supabase, req.user.id, {})
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
    const query = parseOrThrow(
      z.object({
        from: z.string(),
        to: z.string(),
      }),
      (req.query ?? {}) as Record<string, unknown>,
    )

    const rows = await listVeprimetForAnalytics(supabase, req.user.id, query)

    if (req.user.isLegacy) {
      return {
        data: buildSummaryByCountry(
          rows.map((r) => ({
            lloji: r.lloji as 'Hyrje' | 'Dalje',
            shteti: r.shteti,
            sasia: r.sasia,
            totali: r.totali,
          })),
        ),
      }
    }

    const lokacionet = await listLokacionetByOwner(supabase, req.user.id)
    const summaryLokacionet = lokacionet.filter((l) => l.show_in_summary)
    return {
      data: buildSummaryByLocation(
        rows.map((r) => ({
          lloji: r.lloji as 'Hyrje' | 'Dalje',
          lokacioni_id: r.lokacioni_id ?? '',
          sasia: r.sasia,
          totali: r.totali,
        })),
        summaryLokacionet.map((l) => l.id),
      ),
    }
  })
}
