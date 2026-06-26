import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z, ZodError } from 'zod'
import { registerActionBatchRoutes } from './actionBatches.js'
import { registerAuthRoutes } from './auth/routes.js'
import { registerAuthPlugin } from './plugins/auth.js'
import { registerActionRoutes } from './routes/actions.js'
import { registerAnalyticsRoutes } from './routes/analytics.js'
import { registerExportRoutes } from './routes/exports.js'
import { registerProductRoutes } from './routes/products.js'
import { registerLokacionetRoutes } from './routes/lokacionet.js'
import { registerTenantConfigRoutes } from './routes/tenantConfig.js'
import { createSupabaseAdmin } from './supabase.js'
import { AppError, isAppError, mapZodError } from './errors.js'

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(20),
  CORS_ORIGIN: z.string().optional(),
  login_email: z.string().email().optional(),
  login_password: z.string().min(1).optional(),
  LOGIN_EMAIL: z.string().email().optional(),
  LOGIN_PASSWORD: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
})

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FRONTEND_DIST_DIR = path.join(REPO_ROOT, 'frontend', 'dist')

function parseCorsOrigin(value: string | undefined): boolean | string | string[] {
  if (!value) return true
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  if (!origins.includes('https://localhost')) {
    origins.push('https://localhost')
  }
  if (origins.length === 0) return true
  if (origins.length === 1) return origins[0]
  return origins
}

export async function buildApp() {
  const env = EnvSchema.parse(process.env)
  const loginEmail = (env.login_email ?? env.LOGIN_EMAIL)?.trim().toLowerCase()
  const loginPassword = (env.login_password ?? env.LOGIN_PASSWORD)?.trim()
  const sessionSecret = env.SESSION_SECRET ?? env.SUPABASE_SERVICE_KEY

  if (!loginEmail || !loginPassword) {
    throw new Error('Missing login_email/login_password in environment.')
  }

  const app = Fastify({
    logger: true,
    maxParamLength: 512,
  })

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      const mapped = mapZodError(err)
      req.log.error(mapped)
      return reply.code(400).send({ error: mapped.message })
    }

    if (isAppError(err)) {
      req.log.error(err)
      return reply.code(err.statusCode).send({ error: err.message })
    }

    const statusCode = reply.statusCode >= 400 ? reply.statusCode : 500
    req.log.error(err)
    reply.code(statusCode).send({
      error:
        statusCode >= 500
          ? 'Internal error'
          : err instanceof Error
            ? err.message
            : 'Request failed',
    })
  })

  await app.register(cors, {
    origin: parseCorsOrigin(env.CORS_ORIGIN),
    credentials: true,
  })

  await app.register(cookie)
  await app.register(rateLimit, {
    global: false,
    max: 5,
    timeWindow: '1 minute',
  })

  const supabase = createSupabaseAdmin({
    supabaseUrl: env.SUPABASE_URL,
    serviceKey: env.SUPABASE_SERVICE_KEY,
  })

  registerAuthPlugin(app, { sessionSecret, supabase })
  registerAuthRoutes(app, {
    sessionSecret,
    supabase,
    googleClientId: env.GOOGLE_CLIENT_ID,
  })

  app.get('/api/health', async () => ({ ok: true }))

  registerProductRoutes(app, supabase)
  registerActionRoutes(app, supabase)
  registerActionBatchRoutes(app, supabase)
  registerAnalyticsRoutes(app, supabase)
  registerExportRoutes(app, supabase)
  registerLokacionetRoutes(app, supabase)
  registerTenantConfigRoutes(app, supabase)

  if (fs.existsSync(FRONTEND_DIST_DIR)) {
    await app.register(fastifyStatic, {
      root: FRONTEND_DIST_DIR,
      prefix: '/',
    })

    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) {
        reply.code(404).send({ error: 'Not found' })
        return
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        reply.code(404).send({ error: 'Not found' })
        return
      }

      reply.sendFile('index.html')
    })
  } else {
    app.log.warn({ frontendDistDir: FRONTEND_DIST_DIR }, 'Frontend dist folder not found; serving API only.')
  }

  return app
}

export { AppError }
