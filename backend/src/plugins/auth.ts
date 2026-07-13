import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { decodeSessionToken, SESSION_COOKIE } from '../auth/session.js'
import { resolveSessionUser } from '../services/auth/index.js'

export type AuthPluginDeps = {
  sessionSecret: string
  supabase: SupabaseClient
}

const PUBLIC_API_PREFIXES = [
  '/api/login',
  '/api/logout',
  '/api/session',
  '/api/health',
  '/api/auth/signup',
  '/api/auth/google',
]

export function registerAuthPlugin(app: FastifyInstance, deps: AuthPluginDeps) {
  app.addHook('preHandler', async (req, reply) => {
    if (!req.url.startsWith('/api/')) return
    if (PUBLIC_API_PREFIXES.some((prefix) => req.url.startsWith(prefix))) return

    const payload = decodeSessionToken(deps.sessionSecret, req.cookies[SESSION_COOKIE])
    if (!payload) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const user = await resolveSessionUser(deps.supabase, payload.sub)
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    req.user = user
  })
}
