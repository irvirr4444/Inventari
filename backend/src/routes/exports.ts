import type { FastifyInstance } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseOrThrow } from '../errors.js'
import {
  ActionsExportQuerySchema,
  exportActionsCsv,
  exportHistoryDocx,
  exportHistoryPdf,
  exportHistoryXlsx,
  exportInventariXlsx,
  exportProductsXlsx,
  HistoryExportQuerySchema,
  HistoryExportBodySchema,
  ProductsExportQuerySchema,
} from '../services/exports/index.js'
import { handleRouteError } from './routeError.js'

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
      return handleRouteError(err, reply)
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
      return handleRouteError(err, reply)
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
      return handleRouteError(err, reply)
    }
  })

  app.get('/api/exports/history.xlsx', async (req, reply) => {
    try {
      const query = parseOrThrow(
        HistoryExportQuerySchema,
        (req.query ?? {}) as Record<string, unknown>,
      )
      const { buffer, filename } = await exportHistoryXlsx(supabase, req.user, query)
      reply.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      return buffer
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.post('/api/exports/history.xlsx', async (req, reply) => {
    try {
      const body = parseOrThrow(HistoryExportBodySchema, req.body ?? {})
      const { buffer, filename } = await exportHistoryXlsx(supabase, req.user, body)
      reply.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      return buffer
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.post('/api/exports/history.pdf', async (req, reply) => {
    try {
      const body = parseOrThrow(HistoryExportBodySchema, req.body ?? {})
      const { buffer, filename } = await exportHistoryPdf(supabase, req.user, body)
      reply.header('Content-Type', 'application/pdf')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      return buffer
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })

  app.post('/api/exports/history.docx', async (req, reply) => {
    try {
      const body = parseOrThrow(HistoryExportBodySchema, req.body ?? {})
      const { buffer, filename } = await exportHistoryDocx(supabase, req.user, body)
      reply.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      )
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      return buffer
    } catch (err) {
      return handleRouteError(err, reply)
    }
  })
}
