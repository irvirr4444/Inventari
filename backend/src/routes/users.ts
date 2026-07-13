import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  createManagedUser,
  deleteManagedUser,
  getManagedUserAccess,
  listManagedUsers,
  replaceManagedUserAccess,
  updateManagedUser,
} from '../services/users/index.js'
import { handleRouteError } from './routeError.js'

const UserIdParamsSchema = z.object({ id: z.string().uuid() })

export function registerUserRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get('/api/users', async (req, reply) => {
    try {
      const search = (req.query as { search?: string }).search
      const data = await listManagedUsers(supabase, req.user, { search })
      return { data }
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.post('/api/users', async (req, reply) => {
    try {
      const data = await createManagedUser(supabase, req.user, req.body)
      return { data }
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.patch('/api/users/:id', async (req, reply) => {
    try {
      const params = UserIdParamsSchema.parse(req.params)
      const data = await updateManagedUser(supabase, req.user, params.id, req.body)
      return { data }
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.delete('/api/users/:id', async (req, reply) => {
    try {
      const params = UserIdParamsSchema.parse(req.params)
      return await deleteManagedUser(supabase, req.user, params.id)
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.get('/api/users/:id/access', async (req, reply) => {
    try {
      const params = UserIdParamsSchema.parse(req.params)
      return await getManagedUserAccess(supabase, req.user, params.id)
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.put('/api/users/:id/access', async (req, reply) => {
    try {
      const params = UserIdParamsSchema.parse(req.params)
      return await replaceManagedUserAccess(supabase, req.user, params.id, req.body)
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })
}
