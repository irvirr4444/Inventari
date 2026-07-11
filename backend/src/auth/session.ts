import type { FastifyReply } from 'fastify'
import crypto from 'node:crypto'
import { z } from 'zod'

export const SESSION_COOKIE = 'inventari_session'

/** Default 24 hours. Override via SESSION_MAX_AGE_SECONDS if a deployment needs a different policy. */
const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24

function parseSessionMaxAgeSeconds(): number {
  const raw = process.env.SESSION_MAX_AGE_SECONDS
  if (!raw) return DEFAULT_SESSION_MAX_AGE_SECONDS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 60) return DEFAULT_SESSION_MAX_AGE_SECONDS
  return parsed
}

export const SESSION_MAX_AGE_SECONDS = parseSessionMaxAgeSeconds()

const SessionPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().optional(),
  exp: z.number(),
  nonce: z.string(),
})

export type SessionPayload = z.infer<typeof SessionPayloadSchema>

export function signSession(sessionSecret: string, payload: string) {
  return crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url')
}

export function createSessionToken(
  sessionSecret: string,
  user: { id: string; email: string | null },
) {
  const payload = JSON.stringify({
    sub: user.id,
    email: user.email ?? undefined,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    nonce: crypto.randomBytes(16).toString('base64url'),
  })
  const encodedPayload = Buffer.from(payload).toString('base64url')
  return `${encodedPayload}.${signSession(sessionSecret, encodedPayload)}`
}

export function decodeSessionToken(
  sessionSecret: string,
  token: string | undefined,
): SessionPayload | null {
  if (!token) return null
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expected = signSession(sessionSecret, encodedPayload)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const raw = Buffer.from(encodedPayload, 'base64url').toString('utf8')
    const parsed = SessionPayloadSchema.parse(JSON.parse(raw))
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}

export function verifySessionToken(sessionSecret: string, token: string | undefined) {
  return decodeSessionToken(sessionSecret, token) !== null
}

export function setSessionCookie(
  reply: FastifyReply,
  sessionSecret: string,
  user: { id: string; email: string | null },
) {
  const secure = process.env.NODE_ENV === 'production'
  reply.setCookie(SESSION_COOKIE, createSessionToken(sessionSecret, user), {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(reply: FastifyReply) {
  const secure = process.env.NODE_ENV === 'production'
  reply.clearCookie(SESSION_COOKIE, {
    path: '/',
    secure,
    sameSite: secure ? 'none' : 'lax',
  })
}
