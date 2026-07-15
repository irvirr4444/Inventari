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
  withExportSlot,
} from '../services/exports/index.js'
import { handleRouteError } from './routeError.js'

const EXPORT_ROUTE_RATE_LIMIT = {
  max: 8,
  timeWindow: '1 minute' as const,
}

export function registerExportRoutes(app: FastifyInstance, supabase: SupabaseClient) {
  app.get(
    '/api/exports/actions.csv',
    { config: { rateLimit: EXPORT_ROUTE_RATE_LIMIT } },
    async (req, reply) => {
      try {
        const query = parseOrThrow(
          ActionsExportQuerySchema,
          (req.query ?? {}) as Record<string, unknown>,
        )
        const csv = await withExportSlot(() => exportActionsCsv(supabase, req.user, query))
        reply.header('Content-Type', 'text/csv; charset=utf-8')
        reply.header('Content-Disposition', 'attachment; filename="veprime.csv"')
        return csv
      } catch (err) {
        return handleRouteError(err, reply)
      }
    },
  )

  app.get(
    '/api/exports/products.xlsx',
    { config: { rateLimit: EXPORT_ROUTE_RATE_LIMIT } },
    async (req, reply) => {
      try {
        const query = parseOrThrow(
          ProductsExportQuerySchema,
          (req.query ?? {}) as Record<string, unknown>,
        )
        const { buffer, filename } = await withExportSlot(() =>
          exportProductsXlsx(supabase, req.user, query),
        )
        reply.header(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        reply.header('Content-Disposition', `attachment; filename="${filename}"`)
        return buffer
      } catch (err) {
        return handleRouteError(err, reply)
      }
    },
  )

  app.get(
    '/api/exports/actions.xlsx',
    { config: { rateLimit: EXPORT_ROUTE_RATE_LIMIT } },
    async (req, reply) => {
      try {
        const query = parseOrThrow(
          ActionsExportQuerySchema,
          (req.query ?? {}) as Record<string, unknown>,
        )
        const { buffer, filename } = await withExportSlot(() =>
          exportInventariXlsx(supabase, req.user, query),
        )
        reply.header(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        reply.header('Content-Disposition', `attachment; filename="${filename}"`)
        return buffer
      } catch (err) {
        return handleRouteError(err, reply)
      }
    },
  )

  app.get(
    '/api/exports/history.xlsx',
    { config: { rateLimit: EXPORT_ROUTE_RATE_LIMIT } },
    async (req, reply) => {
      try {
        const query = parseOrThrow(
          HistoryExportQuerySchema,
          (req.query ?? {}) as Record<string, unknown>,
        )
        const { buffer, filename } = await withExportSlot(() =>
          exportHistoryXlsx(supabase, req.user, query),
        )
        reply.header(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        reply.header('Content-Disposition', `attachment; filename="${filename}"`)
        return buffer
      } catch (err) {
        return handleRouteError(err, reply)
      }
    },
  )

  app.post(
    '/api/exports/history.xlsx',
    { config: { rateLimit: EXPORT_ROUTE_RATE_LIMIT } },
    async (req, reply) => {
      try {
        const body = parseOrThrow(HistoryExportBodySchema, req.body ?? {})
        const { buffer, filename } = await withExportSlot(() =>
          exportHistoryXlsx(supabase, req.user, body),
        )
        reply.header(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        reply.header('Content-Disposition', `attachment; filename="${filename}"`)
        return buffer
      } catch (err) {
        return handleRouteError(err, reply)
      }
    },
  )

  app.post(
    '/api/exports/history.pdf',
    { config: { rateLimit: EXPORT_ROUTE_RATE_LIMIT } },
    async (req, reply) => {
      try {
        const body = parseOrThrow(HistoryExportBodySchema, req.body ?? {})
        const { buffer, filename } = await withExportSlot(() =>
          exportHistoryPdf(supabase, req.user, body),
        )
        reply.header('Content-Type', 'application/pdf')
        reply.header('Content-Disposition', `attachment; filename="${filename}"`)
        return buffer
      } catch (err) {
        return handleRouteError(err, reply)
      }
    },
  )

  app.post(
    '/api/exports/history.docx',
    { config: { rateLimit: EXPORT_ROUTE_RATE_LIMIT } },
    async (req, reply) => {
      try {
        const body = parseOrThrow(HistoryExportBodySchema, req.body ?? {})
        const { buffer, filename } = await withExportSlot(() =>
          exportHistoryDocx(supabase, req.user, body),
        )
        reply.header(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        reply.header('Content-Disposition', `attachment; filename="${filename}"`)
        return buffer
      } catch (err) {
        return handleRouteError(err, reply)
      }
    },
  )
}
