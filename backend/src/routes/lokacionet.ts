import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CreateLokacioniSchema, PatchLokacioniSchema } from '@inventari/shared'
import { z } from 'zod'
import { parseOrThrow } from '../errors.js'
import {
  createUserLokacioni,
  deleteUserLokacioni,
  listUserLokacionet,
  patchUserLokacioni,
} from '../services/locations/index.js'
import { handleRouteError } from './routeError.js'

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
      return handleRouteError(err, reply)
    }
  })

  app.patch('/api/lokacionet/:id', async (req, reply) => {
    try {
      const params = parseOrThrow(LokacioniIdParamsSchema, req.params)
      const body = parseOrThrow(PatchLokacioniSchema, req.body)
      const result = await patchUserLokacioni(supabase, req.user, params.id, body)
      return result
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.delete('/api/lokacionet/:id', async (req, reply) => {
    try {
      const params = parseOrThrow(LokacioniIdParamsSchema, req.params)
      return await deleteUserLokacioni(supabase, req.user, params.id)
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })
}
