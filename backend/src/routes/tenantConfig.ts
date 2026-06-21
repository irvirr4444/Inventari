import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isAppError } from '../errors.js'
import {
  completeOnboardingForUser,
  getTenantConfigForUser,
  markTutorialSeenForUser,
  patchTenantConfigForUser,
  postTenantConfigForUser,
} from '../services/tenantConfigService.js'

function handleError(err: unknown, reply: { code: (n: number) => void }) {
  if (isAppError(err)) {
    reply.code(err.statusCode)
    return { error: err.message }
  }
  throw err
}

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
      return handleError(err, reply)
    }
  })

  app.patch('/api/tenant-config', async (req, reply) => {
    try {
      const data = await patchTenantConfigForUser(supabase, req.user, req.body)
      return { data }
    } catch (err) {
      return handleError(err, reply)
    }
  })

  app.post('/api/tenant-config/complete', async (req, reply) => {
    try {
      const data = await completeOnboardingForUser(supabase, req.user)
      return { data }
    } catch (err) {
      return handleError(err, reply)
    }
  })

  app.post('/api/tenant-config/complete-onboarding', async (req, reply) => {
    try {
      const data = await completeOnboardingForUser(supabase, req.user)
      return { data }
    } catch (err) {
      return handleError(err, reply)
    }
  })

  app.post('/api/tenant-config/tutorial-seen', async (req, reply) => {
    try {
      const data = await markTutorialSeenForUser(supabase, req.user)
      return { data }
    } catch (err) {
      return handleError(err, reply)
    }
  })
}
