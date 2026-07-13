import type { FastifyReply } from 'fastify'
import { isAppError } from '../errors.js'

export function handleRouteError(err: unknown, reply: FastifyReply) {
  if (isAppError(err)) {
    reply.code(err.statusCode)
    return { error: err.message }
  }

  throw err
}
