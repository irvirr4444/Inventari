import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildSummaryByCountry, CountrySchema } from '@inventari/shared'
import { z } from 'zod'
import { AppError, parseOrThrow } from '../errors.js'

export function registerAnalyticsRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get('/api/analytics/stock', async (req) => {
    const query = parseOrThrow(
      z.object({ shteti: CountrySchema }),
      (req.query ?? {}) as Record<string, unknown>,
    )

    const { data, error } = await supabase
      .from('produkti')
      .select('id,kodi,emri,gjendje_kosove,gjendje_shqiperi,updated_at')
      .order('emri', { ascending: true })

    if (error) throw new AppError(500, error.message)

    const mapped =
      (data ?? []).map((p) => ({
        id: p.id,
        kodi: p.kodi,
        emri: p.emri,
        gjendje:
          query.shteti === 'XK'
            ? Number(p.gjendje_kosove ?? 0)
            : Number(p.gjendje_shqiperi ?? 0),
      })) ?? []
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

    const { data, error } = await supabase
      .from('veprimi')
      .select('lloji,shteti,sasia,totali')
      .gte('data', query.from)
      .lte('data', query.to)

    if (error) throw new AppError(500, error.message)

    return {
      data: buildSummaryByCountry((data ?? []) as Parameters<typeof buildSummaryByCountry>[0]),
    }
  })
}
