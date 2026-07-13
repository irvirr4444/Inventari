import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ProductSearchQuerySchema, ProductIdParamsSchema } from '@inventari/shared'
import { parseOrThrow } from '../errors.js'
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from '../services/products/index.js'
import { handleRouteError } from './routeError.js'

export function registerProductRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get('/api/products', async (req) => {
    const query = parseOrThrow(ProductSearchQuerySchema, (req.query ?? {}) as Record<string, unknown>)
    const data = await listProducts(supabase, req.user, query)
    return { data }
  })

  app.post('/api/products', async (req, reply) => {
    try {
      const data = await createProduct(supabase, req.user, req.body)
      return { data }
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.patch('/api/products/:id', async (req, reply) => {
    try {
      const params = parseOrThrow(ProductIdParamsSchema, req.params)
      const data = await updateProduct(supabase, req.user, params.id, req.body)
      return { data }
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.delete('/api/products/:id', async (req, reply) => {
    try {
      const params = parseOrThrow(ProductIdParamsSchema, req.params)
      return await deleteProduct(supabase, req.user, params.id)
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })
}
