import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { parseOrThrow, isAppError } from '../errors.js'
import {
  createUserLokacioni,
  listUserLokacionet,
  patchUserLokacioni,
} from '../services/lokacioniService.js'

const CreateLokacioniSchema = z.object({
  emri: z.string().min(1),
  kodi: z.string().min(1).max(8),
  flag_emoji: z.string().max(8).optional().nullable(),
  rradhitja: z.number().int().nonnegative().optional(),
})

const PatchLokacioniSchema = z.object({
  emri: z.string().min(1).optional(),
  kodi: z.string().min(1).max(8).optional(),
  flag_emoji: z.string().max(8).optional().nullable(),
  rradhitja: z.number().int().nonnegative().optional(),
  show_in_summary: z.boolean().optional(),
  aktiv: z.boolean().optional(),
})

const LokacioniIdParamsSchema = z.object({ id: z.string().uuid() })

export function registerLokacionetRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get('/api/lokacionet', async (req) => {
    const includeInactive = (req.query as { include_inactive?: string }).include_inactive === '1'
    const data = await listUserLokacionet(supabase, req.user, { includeInactive })
    return { data }
  })

  app.post('/api/lokacionet', async (req, reply) => {
    try {
      const body = parseOrThrow(CreateLokacioniSchema, req.body)
      const data = await createUserLokacioni(supabase, req.user, body)
      return { data }
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })

  app.patch('/api/lokacionet/:id', async (req, reply) => {
    try {
      const params = parseOrThrow(LokacioniIdParamsSchema, req.params)
      const body = parseOrThrow(PatchLokacioniSchema, req.body)
      const result = await patchUserLokacioni(supabase, req.user, params.id, body)
      return result
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })
}
