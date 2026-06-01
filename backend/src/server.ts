import cors from '@fastify/cors'
import ExcelJS from 'exceljs'
import Fastify from 'fastify'
import { z } from 'zod'
import { createSupabaseAdmin } from './supabase.js'

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(20),
  CORS_ORIGIN: z.string().optional(),
})

export async function buildApp() {
  const env = EnvSchema.parse(process.env)

  const app = Fastify({
    logger: true,
  })

  app.setErrorHandler((err, _req, reply) => {
    const statusCode = reply.statusCode >= 400 ? reply.statusCode : 500
    reply.code(statusCode).send({
      error: err instanceof Error ? err.message : 'Internal error',
    })
  })

  await app.register(cors, {
    origin: env.CORS_ORIGIN ?? true,
  })

  const supabase = createSupabaseAdmin({
    supabaseUrl: env.SUPABASE_URL,
    serviceKey: env.SUPABASE_SERVICE_KEY,
  })

  app.get('/api/health', async () => ({ ok: true }))

  // Products
  app.get('/api/products', async (req) => {
    const query = z
      .object({
        search: z.string().optional(),
      })
      .parse((req.query ?? {}) as Record<string, unknown>)

    let q = supabase
      .from('produkti')
      .select(
        'id,kodi,emri,pershkrimi,gjendje_kosove,gjendje_shqiperi,created_at,updated_at',
      )
      .order('emri', { ascending: true })

    if (query.search && query.search.trim()) {
      const s = query.search.trim()
      q = q.or(`kodi.ilike.%${s}%,emri.ilike.%${s}%`)
    }

    const { data, error } = await q
    if (error) throw error
    return { data }
  })

  app.post('/api/products', async (req, reply) => {
    const body = z
      .object({
        kodi: z.string().min(1),
        emri: z.string().min(1),
        pershkrimi: z.string().optional(),
        gjendje_kosove: z.number().int().nonnegative().optional(),
        gjendje_shqiperi: z.number().int().nonnegative().optional(),
      })
      .parse(req.body)

    const { data, error } = await supabase
      .from('produkti')
      .insert({
        kodi: body.kodi,
        emri: body.emri,
        pershkrimi: body.pershkrimi ?? null,
        gjendje_kosove: body.gjendje_kosove ?? 0,
        gjendje_shqiperi: body.gjendje_shqiperi ?? 0,
      })
      .select(
        'id,kodi,emri,pershkrimi,gjendje_kosove,gjendje_shqiperi,created_at,updated_at',
      )
      .single()

    if (error) {
      reply.code(400)
      return { error: error.message }
    }

    return { data }
  })

  app.patch('/api/products/:id', async (req, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z
      .object({
        kodi: z.string().min(1).optional(),
        emri: z.string().min(1).optional(),
        pershkrimi: z.string().nullable().optional(),
        gjendje_kosove: z.number().int().nonnegative().optional(),
        gjendje_shqiperi: z.number().int().nonnegative().optional(),
      })
      .parse(req.body)

    const { data, error } = await supabase
      .from('produkti')
      .update({
        kodi: body.kodi,
        emri: body.emri,
        pershkrimi:
          body.pershkrimi === undefined ? undefined : body.pershkrimi,
        gjendje_kosove: body.gjendje_kosove,
        gjendje_shqiperi: body.gjendje_shqiperi,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select(
        'id,kodi,emri,pershkrimi,gjendje_kosove,gjendje_shqiperi,created_at,updated_at',
      )
      .single()

    if (error) {
      reply.code(400)
      return { error: error.message }
    }

    return { data }
  })

  // Since your schema doesn’t include soft-delete, delete = hard delete for now.
  app.delete('/api/products/:id', async (req, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params)

    const { error } = await supabase.from('produkti').delete().eq('id', params.id)
    if (error) {
      reply.code(400)
      return { error: error.message }
    }
    return { ok: true }
  })

  const ActionItemSchema = z.object({
    kodi_produktit: z.string().min(1),
    cmimi_njesi: z.number().nonnegative(),
    sasia: z.number().int().positive(),
  })

  const ActionBatchSchema = z.object({
    lloji: z.enum(['Hyrje', 'Dalje']),
    data: z.string().optional(), // YYYY-MM-DD
    shteti: z.enum(['XK', 'AL']),
    items: z.array(ActionItemSchema).min(1),
  })

  const ActionSingleSchema = z.object({
    lloji: z.enum(['Hyrje', 'Dalje']),
    data: z.string().optional(), // YYYY-MM-DD
    shteti: z.enum(['XK', 'AL']),
    kodi_produktit: z.string().min(1),
    cmimi_njesi: z.number().nonnegative(),
    sasia: z.number().int().positive(),
  })

  // Actions / Veprimi
  // Supports:
  // - single row (kodi_produktit/cmimi_njesi/sasia)
  // - batch (items: [...]) to match your “one action includes many products” UI
  app.post('/api/actions', async (req, reply) => {
    const parsed = z.union([ActionBatchSchema, ActionSingleSchema]).parse(req.body)
    const body =
      'items' in parsed
        ? parsed
        : {
            lloji: parsed.lloji,
            data: parsed.data,
            shteti: parsed.shteti,
            items: [
              {
                kodi_produktit: parsed.kodi_produktit,
                cmimi_njesi: parsed.cmimi_njesi,
                sasia: parsed.sasia,
              },
            ],
          }

    // Best-effort stock validation (strict correctness comes from the DB trigger/RPC)
    if (body.lloji === 'Dalje') {
      for (const it of body.items) {
        const { data: p, error: pErr } = await supabase
          .from('produkti')
          .select('gjendje_kosove,gjendje_shqiperi')
          .eq('kodi', it.kodi_produktit)
          .single()

        if (pErr) {
          reply.code(400)
          return { error: pErr.message }
        }
        const current =
          body.shteti === 'XK' ? Number(p?.gjendje_kosove ?? 0) : Number(p?.gjendje_shqiperi ?? 0)
        if (it.sasia > current) {
          reply.code(400)
          return { error: `Nuk ka gjendje te mjaftueshme per ${it.kodi_produktit}.` }
        }
      }
    }

    const rows = body.items.map((it) => ({
      lloji: body.lloji,
      data: body.data ?? undefined,
      shteti: body.shteti,
      kodi_produktit: it.kodi_produktit,
      cmimi_njesi: it.cmimi_njesi,
      sasia: it.sasia,
    }))

    const { data, error } = await supabase.from('veprimi').insert(rows).select('*')

    if (error) {
      reply.code(400)
      return { error: error.message }
    }

    return { data }
  })

  app.get('/api/actions', async (req) => {
    const query = z
      .object({
        shteti: z.enum(['XK', 'AL']).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        lloji: z.enum(['Hyrje', 'Dalje']).optional(),
        kodi: z.string().optional(),
        limit: z.coerce.number().int().positive().max(500).optional(),
      })
      .parse((req.query ?? {}) as Record<string, unknown>)

    let q = supabase
      .from('veprimi')
      .select('*')
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })

    if (query.shteti) q = q.eq('shteti', query.shteti)
    if (query.lloji) q = q.eq('lloji', query.lloji)
    if (query.kodi) q = q.eq('kodi_produktit', query.kodi)
    if (query.from) q = q.gte('data', query.from)
    if (query.to) q = q.lte('data', query.to)
    if (query.limit) q = q.limit(query.limit)

    const { data, error } = await q
    if (error) throw error
    return { data }
  })

  // Analytics
  app.get('/api/analytics/stock', async (req) => {
    const query = z
      .object({ shteti: z.enum(['XK', 'AL']) })
      .parse((req.query ?? {}) as Record<string, unknown>)

    const { data, error } = await supabase
      .from('produkti')
      .select('id,kodi,emri,pershkrimi,gjendje_kosove,gjendje_shqiperi,updated_at')
      .order('emri', { ascending: true })

    if (error) throw error
    const mapped =
      (data ?? []).map((p) => ({
        id: p.id,
        kodi: p.kodi,
        emri: p.emri,
        pershkrimi: p.pershkrimi ?? null,
        gjendje:
          query.shteti === 'XK'
            ? Number(p.gjendje_kosove ?? 0)
            : Number(p.gjendje_shqiperi ?? 0),
      })) ?? []
    return { data: mapped }
  })

  app.get('/api/analytics/summary', async (req) => {
    const query = z
      .object({
        shteti: z.enum(['XK', 'AL']),
        from: z.string(),
        to: z.string(),
      })
      .parse((req.query ?? {}) as Record<string, unknown>)

    const { data, error } = await supabase
      .from('veprimi')
      .select('lloji,sasia,totali')
      .eq('shteti', query.shteti)
      .gte('data', query.from)
      .lte('data', query.to)

    if (error) throw error

    const summary = {
      in_qty: 0,
      in_value: 0,
      out_qty: 0,
      out_value: 0,
    }

    for (const row of data ?? []) {
      const qty = Number(row.sasia ?? 0)
      const total = Number(row.totali ?? 0)
      if (row.lloji === 'Hyrje') {
        summary.in_qty += qty
        summary.in_value += total
      } else if (row.lloji === 'Dalje') {
        summary.out_qty += qty
        summary.out_value += total
      }
    }

    return { data: summary }
  })

  function csvEscape(value: unknown) {
    const s = String(value ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`
    return s
  }

  async function queryActionsForExport(query: {
    shteti?: 'XK' | 'AL'
    from?: string
    to?: string
    lloji?: 'Hyrje' | 'Dalje'
  }) {
    let q = supabase
      .from('veprimi')
      .select('*')
      .order('data', { ascending: true })
      .order('created_at', { ascending: true })

    if (query.shteti) q = q.eq('shteti', query.shteti)
    if (query.lloji) q = q.eq('lloji', query.lloji)
    if (query.from) q = q.gte('data', query.from)
    if (query.to) q = q.lte('data', query.to)

    const { data, error } = await q
    if (error) throw error
    return data ?? []
  }

  // Exports
  app.get('/api/exports/actions.csv', async (req, reply) => {
    const query = z
      .object({
        shteti: z.enum(['XK', 'AL']).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        lloji: z.enum(['Hyrje', 'Dalje']).optional(),
      })
      .parse((req.query ?? {}) as Record<string, unknown>)

    const rows = await queryActionsForExport(query)

    const header = [
      'id',
      'lloji',
      'data',
      'shteti',
      'kodi_produktit',
      'cmimi_njesi',
      'sasia',
      'totali',
      'created_at',
    ]

    const lines = [header.join(',')]
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.lloji,
          r.data,
          r.shteti,
          r.kodi_produktit,
          r.cmimi_njesi,
          r.sasia,
          r.totali,
          r.created_at,
        ]
          .map(csvEscape)
          .join(','),
      )
    }

    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', 'attachment; filename="veprime.csv"')
    return lines.join('\n')
  })

  app.get('/api/exports/actions.xlsx', async (req, reply) => {
    const query = z
      .object({
        shteti: z.enum(['XK', 'AL']).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        lloji: z.enum(['Hyrje', 'Dalje']).optional(),
      })
      .parse((req.query ?? {}) as Record<string, unknown>)

    const rows = await queryActionsForExport(query)

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Veprime')

    sheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Lloji', key: 'lloji', width: 10 },
      { header: 'Data', key: 'data', width: 12 },
      { header: 'Shteti', key: 'shteti', width: 8 },
      { header: 'Kodi', key: 'kodi_produktit', width: 18 },
      { header: 'Cmimi/Njesi', key: 'cmimi_njesi', width: 14 },
      { header: 'Sasia', key: 'sasia', width: 10 },
      { header: 'Totali', key: 'totali', width: 14 },
      { header: 'Krijuar', key: 'created_at', width: 24 },
    ]

    for (const r of rows) {
      sheet.addRow({
        id: r.id,
        lloji: r.lloji,
        data: r.data,
        shteti: r.shteti,
        kodi_produktit: r.kodi_produktit,
        cmimi_njesi: r.cmimi_njesi,
        sasia: r.sasia,
        totali: r.totali,
        created_at: r.created_at,
      })
    }

    const buf = await workbook.xlsx.writeBuffer()
    reply.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    reply.header('Content-Disposition', 'attachment; filename="veprime.xlsx"')
    return buf
  })

  return app
}

