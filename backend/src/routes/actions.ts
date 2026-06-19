import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ActionCreateBodySchema,
  ActionCreateDynamicBodySchema,
  ActionsListQuerySchema,
} from '@inventari/shared'
import { isAppError, parseOrThrow } from '../errors.js'
import { createAction, listActions } from '../services/actionsService.js'

export function registerActionRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.post('/api/actions', async (req, reply) => {
    try {
      if (req.user.isLegacy) {
        const parsed = parseOrThrow(ActionCreateBodySchema, req.body)
        return await createAction(supabase, req.user, parsed)
      }
      const parsed = parseOrThrow(ActionCreateDynamicBodySchema, req.body)
      return await createAction(supabase, req.user, parsed, { dynamic: true })
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
    const data = await listActions(supabase, req.user, query)
    return { data }
  })
}
