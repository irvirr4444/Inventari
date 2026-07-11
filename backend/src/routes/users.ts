import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { isAppError } from '../errors.js'
import {
  createManagedUser,
  deleteManagedUser,
  getManagedUserAccess,
  listManagedUsers,
  replaceManagedUserAccess,
  updateManagedUser,
} from '../services/userManagementService.js'

const UserIdParamsSchema = z.object({ id: z.string().uuid() })

export function registerUserRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get('/api/users', async (req, reply) => {
    try {
      const search = (req.query as { search?: string }).search
      const data = await listManagedUsers(supabase, req.user, { search })
      return { data }
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })

  app.post('/api/users', async (req, reply) => {
    try {
      const data = await createManagedUser(supabase, req.user, req.body)
      return { data }
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })

  app.patch('/api/users/:id', async (req, reply) => {
    try {
      const params = UserIdParamsSchema.parse(req.params)
      const data = await updateManagedUser(supabase, req.user, params.id, req.body)
      return { data }
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })

  app.delete('/api/users/:id', async (req, reply) => {
    try {
      const params = UserIdParamsSchema.parse(req.params)
      return await deleteManagedUser(supabase, req.user, params.id)
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })

  app.get('/api/users/:id/access', async (req, reply) => {
    try {
      const params = UserIdParamsSchema.parse(req.params)
      return await getManagedUserAccess(supabase, req.user, params.id)
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })

  app.put('/api/users/:id/access', async (req, reply) => {
    try {
      const params = UserIdParamsSchema.parse(req.params)
      return await replaceManagedUserAccess(supabase, req.user, params.id, req.body)
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })
}
