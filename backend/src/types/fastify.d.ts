import type { SessionUser } from '../domain/user.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser
  }
}
