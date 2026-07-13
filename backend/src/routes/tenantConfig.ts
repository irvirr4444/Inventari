import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  completeOnboardingForUser,
  getTenantConfigForUser,
  markTutorialSeenForUser,
  patchTenantConfigForUser,
  postTenantConfigForUser,
} from '../services/tenant/index.js'
import { handleRouteError } from './routeError.js'

export function registerTenantConfigRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get('/api/tenant-config', async (req) => {
    const result = await getTenantConfigForUser(supabase, req.user)
    return { data: result.config, has_tenant_config: result.has_tenant_config }
  })

  app.post('/api/tenant-config', async (req, reply) => {
    try {
      const data = await postTenantConfigForUser(supabase, req.user, req.body)
      return { data }
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.patch('/api/tenant-config', async (req, reply) => {
    try {
      const data = await patchTenantConfigForUser(supabase, req.user, req.body)
      return { data }
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.post('/api/tenant-config/complete', async (req, reply) => {
    try {
      const data = await completeOnboardingForUser(supabase, req.user)
      return { data }
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.post('/api/tenant-config/complete-onboarding', async (req, reply) => {
    try {
      const data = await completeOnboardingForUser(supabase, req.user)
      return { data }
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.post('/api/tenant-config/tutorial-seen', async (req, reply) => {
    try {
      const data = await markTutorialSeenForUser(supabase, req.user)
      return { data }
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })
}
