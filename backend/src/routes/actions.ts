import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ActionCreateBodySchema, ActionsListQuerySchema } from '@inventari/shared'
import { isAppError, parseOrThrow } from '../errors.js'
import { createAction, listActions } from '../services/actionsService.js'

export function registerActionRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.post('/api/actions', async (req, reply) => {
    try {
      const parsed = parseOrThrow(ActionCreateBodySchema, req.body)
      return await createAction(supabase, parsed)
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })

  app.get('/api/actions', async (req) => {
    const query = parseOrThrow(ActionsListQuerySchema, (req.query ?? {}) as Record<string, unknown>)
    const data = await listActions(supabase, query)
    return { data }
  })
}
