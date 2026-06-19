import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isAppError, parseOrThrow } from '../errors.js'
import {
  ActionsExportQuerySchema,
  exportActionsCsv,
  exportInventariXlsx,
  exportProductsXlsx,
  ProductsExportQuerySchema,
} from '../services/exportsService.js'

export function registerExportRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get('/api/exports/actions.csv', async (req, reply) => {
    try {
      const query = parseOrThrow(
        ActionsExportQuerySchema,
        (req.query ?? {}) as Record<string, unknown>,
      )
      const csv = await exportActionsCsv(supabase, req.user, query)
      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', 'attachment; filename="veprime.csv"')
      return csv
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })

  app.get('/api/exports/products.xlsx', async (req, reply) => {
    try {
      const query = parseOrThrow(
        ProductsExportQuerySchema,
        (req.query ?? {}) as Record<string, unknown>,
      )
      const { buffer, filename } = await exportProductsXlsx(supabase, req.user, query)
      reply.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      return buffer
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })

  app.get('/api/exports/actions.xlsx', async (req, reply) => {
    try {
      const query = parseOrThrow(
        ActionsExportQuerySchema,
        (req.query ?? {}) as Record<string, unknown>,
      )
      const { buffer, filename } = await exportInventariXlsx(supabase, req.user, query)
      reply.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      return buffer
    } catch (err) {
      if (isAppError(err)) {
        reply.code(err.statusCode)
        return { error: err.message }
      }
      throw err
    }
  })
}
