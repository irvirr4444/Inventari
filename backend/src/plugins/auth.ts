import type { FastifyInstance } from 'fastify'
import { SESSION_COOKIE, verifySessionToken } from '../auth/session.js'

export type AuthPluginDeps = {
  sessionSecret: string
}

export function registerAuthPlugin(app: FastifyInstance, deps: AuthPluginDeps) {
  app.addHook('preHandler', async (req, reply) => {
    if (!req.url.startsWith('/api/')) return
    if (
      req.url.startsWith('/api/login') ||
      req.url.startsWith('/api/logout') ||
      req.url.startsWith('/api/session') ||
      req.url.startsWith('/api/health')
    ) {
      return
    }

    if (!verifySessionToken(deps.sessionSecret, req.cookies[SESSION_COOKIE])) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}
