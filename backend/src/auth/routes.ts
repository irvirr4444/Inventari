import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { clearSessionCookie, setSessionCookie, verifySessionToken } from './session.js'
import { parseOrThrow } from '../errors.js'

export type AuthRoutesDeps = {
  loginEmail: string
  loginPassword: string
  sessionSecret: string
}

export function registerAuthRoutes(app: FastifyInstance, deps: AuthRoutesDeps) {
  app.post('/api/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = parseOrThrow(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
      req.body,
    )

    if (body.email.trim().toLowerCase() !== deps.loginEmail || body.password.trim() !== deps.loginPassword) {
      reply.code(401)
      return { error: 'Invalid credentials' }
    }

    setSessionCookie(reply, deps.sessionSecret)
    return { ok: true }
  })

  app.post('/api/logout', async (_req, reply) => {
    clearSessionCookie(reply)
    return { ok: true }
  })

  app.get('/api/session', async (req) => ({
    ok: verifySessionToken(deps.sessionSecret, req.cookies.inventari_session),
  }))
}
