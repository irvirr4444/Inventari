import type { FastifyReply } from 'fastify'
import crypto from 'node:crypto'
import { z } from 'zod'

export const SESSION_COOKIE = 'inventari_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8

export type SessionContext = {
  sessionSecret: string
}

export function signSession(sessionSecret: string, payload: string) {
  return crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url')
}

export function createSessionToken(sessionSecret: string) {
  const payload = JSON.stringify({
    sub: 'admin',
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    nonce: crypto.randomBytes(16).toString('base64url'),
  })
  const encodedPayload = Buffer.from(payload).toString('base64url')
  return `${encodedPayload}.${signSession(sessionSecret, encodedPayload)}`
}

export function verifySessionToken(sessionSecret: string, token: string | undefined) {
  if (!token) return false
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return false

  const expected = signSession(sessionSecret, encodedPayload)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return false
  }

  try {
    const raw = Buffer.from(encodedPayload, 'base64url').toString('utf8')
    const parsed = z.object({ sub: z.literal('admin'), exp: z.number() }).parse(JSON.parse(raw))
    return parsed.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export function setSessionCookie(reply: FastifyReply, sessionSecret: string) {
  reply.setCookie(SESSION_COOKIE, createSessionToken(sessionSecret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: '/' })
}
