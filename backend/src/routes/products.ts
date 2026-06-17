import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ProductSearchQuerySchema } from '@inventari/shared'
import { isAppError } from '../errors.js'
import { parseOrThrow } from '../errors.js'
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from '../services/productsService.js'
import { ProductIdParamsSchema } from '@inventari/shared'

export function registerProductRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get('/api/products', async (req) => {
    const query = parseOrThrow(ProductSearchQuerySchema, (req.query ?? {}) as Record<string, unknown>)
    const data = await listProducts(supabase, query)
    return { data }
  })

  app.post('/api/products', async (req, reply) => {
    try {
      const data = await createProduct(supabase, req.body)
      return { data }
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })

  app.patch('/api/products/:id', async (req, reply) => {
    try {
      const params = parseOrThrow(ProductIdParamsSchema, req.params)
      const data = await updateProduct(supabase, params.id, req.body)
      return { data }
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })

  app.delete('/api/products/:id', async (req, reply) => {
    try {
      const params = parseOrThrow(ProductIdParamsSchema, req.params)
      return await deleteProduct(supabase, params.id)
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })
}
