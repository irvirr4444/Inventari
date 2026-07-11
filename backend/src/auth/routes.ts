import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { parseOrThrow } from '../errors.js'
import { isAppError } from '../errors.js'
import {
  clearSessionCookie,
  decodeSessionToken,
  SESSION_COOKIE,
  setSessionCookie,
} from './session.js'
import {
  getSessionPayload,
  loginWithGoogle,
  loginWithPassword,
  resolveSessionUser,
  signupWithPassword,
} from '../services/authService.js'

export type AuthRoutesDeps = {
  sessionSecret: string
  supabase: SupabaseClient
  googleClientId?: string
}

const LoginBodySchema = z.object({
  emri: z.string().min(1),
  password: z.string().min(1),
})

const SignupBodySchema = z.object({
  emri: z.string().min(1),
  password: z.string().min(8),
})

const GoogleBodySchema = z.object({
  id_token: z.string().min(1),
})

export function registerAuthRoutes(app: FastifyInstance, deps: AuthRoutesDeps) {
  app.post('/api/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = parseOrThrow(LoginBodySchema, req.body)
    try {
      const user = await loginWithPassword(deps.supabase, body.emri, body.password)
      setSessionCookie(reply, deps.sessionSecret, { id: user.id, email: user.email })
      return { ok: true }
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })

  app.post(
    '/api/auth/signup',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = parseOrThrow(SignupBodySchema, req.body)
      try {
        const user = await signupWithPassword(deps.supabase, body)
        setSessionCookie(reply, deps.sessionSecret, { id: user.id, email: user.email })
        return { ok: true }
      } catch (err) {
        if (isAppError(err)) {
          reply.code(err.statusCode)
          return { error: err.message }
        }
        throw err
      }
    },
  )

  app.post(
    '/api/auth/google',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      if (!deps.googleClientId) {
        reply.code(503)
        return { error: 'Google sign-in is not configured' }
      }
      const body = parseOrThrow(GoogleBodySchema, req.body)
      try {
        const user = await loginWithGoogle(deps.supabase, body.id_token, deps.googleClientId)
        setSessionCookie(reply, deps.sessionSecret, { id: user.id, email: user.email })
        return { ok: true }
      } catch (err) {
        if (isAppError(err)) {
          reply.code(err.statusCode)
          return { error: err.message }
        }
        throw err
      }
    },
  )

  app.post('/api/logout', async (_req, reply) => {
    clearSessionCookie(reply)
    return { ok: true }
  })

  app.get('/api/session', async (req, _reply) => {
    const payload = decodeSessionToken(deps.sessionSecret, req.cookies[SESSION_COOKIE])
    if (!payload) return { ok: false as const }

    const user = await resolveSessionUser(deps.supabase, payload.sub)
    if (!user) return { ok: false as const }

    return getSessionPayload(deps.supabase, user)
  })
}
