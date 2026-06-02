import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import ExcelJS from 'exceljs'
import Fastify from 'fastify'
import type { FastifyReply } from 'fastify'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { createSupabaseAdmin } from './supabase.js'

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(20),
  CORS_ORIGIN: z.string().optional(),
  login_email: z.string().email().optional(),
  login_password: z.string().min(1).optional(),
  LOGIN_EMAIL: z.string().email().optional(),
  LOGIN_PASSWORD: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
})

const SESSION_COOKIE = 'inventari_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8

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
  })

  app.setErrorHandler((err, req, reply) => {
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
    origin: env.CORS_ORIGIN ?? true,
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

  app.get('/api/health', async () => ({ ok: true }))

  function signSession(payload: string) {
    return crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url')
  }

  function createSessionToken() {
    const payload = JSON.stringify({
      sub: 'admin',
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
      nonce: crypto.randomBytes(16).toString('base64url'),
    })
    const encodedPayload = Buffer.from(payload).toString('base64url')
    return `${encodedPayload}.${signSession(encodedPayload)}`
  }

  function verifySessionToken(token: string | undefined) {
    if (!token) return false
    const [encodedPayload, signature] = token.split('.')
    if (!encodedPayload || !signature) return false

    const expected = signSession(encodedPayload)
    const actualBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return false
    }

    try {
      const raw = Buffer.from(encodedPayload, 'base64url').toString('utf8')
      const parsed = z.object({ sub: z.literal('admin'), exp: z.number() }).parse(JSON.parse(raw))
      return parsed.exp > Math.floor(Date.now() / 1000)
    } catch {
      return false
    }
  }

  function setSessionCookie(reply: FastifyReply) {
    reply.setCookie(SESSION_COOKIE, createSessionToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    })
  }

  function clearSessionCookie(reply: FastifyReply) {
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
  }

  app.addHook('preHandler', async (req, reply) => {
    if (!req.url.startsWith('/api/')) return
    if (
      req.url.startsWith('/api/login') ||
      req.url.startsWith('/api/logout') ||
      req.url.startsWith('/api/session') ||
      req.url.startsWith('/api/health')
    ) {
      return
    }

    if (!verifySessionToken(req.cookies[SESSION_COOKIE])) {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })

  app.post('/api/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
      })
      .parse(req.body)

    if (body.email.trim().toLowerCase() !== loginEmail || body.password.trim() !== loginPassword) {
      reply.code(401)
      return { error: 'Invalid credentials' }
    }

    setSessionCookie(reply)
    return { ok: true }
  })

  app.post('/api/logout', async (_req, reply) => {
    clearSessionCookie(reply)
    return { ok: true }
  })

  app.get('/api/session', async (req) => ({
    ok: verifySessionToken(req.cookies[SESSION_COOKIE]),
  }))

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

    const { data: product, error: productReadError } = await supabase
      .from('produkti')
      .select('kodi')
      .eq('id', params.id)
      .single()

    if (productReadError) {
      reply.code(400)
      return { error: productReadError.message }
    }

    const { error: actionsDeleteError } = await supabase
      .from('veprimi')
      .delete()
      .eq('kodi_produktit', product.kodi)

    if (actionsDeleteError) {
      reply.code(400)
      return { error: actionsDeleteError.message }
    }

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

    const mirrorRows =
      body.shteti === 'XK' && body.lloji === 'Dalje'
        ? body.items.map((it) => ({
            lloji: 'Hyrje' as const,
            data: body.data ?? undefined,
            shteti: 'AL' as const,
            kodi_produktit: it.kodi_produktit,
            cmimi_njesi: it.cmimi_njesi,
            sasia: it.sasia,
          }))
        : []

    const { data, error } = await supabase
      .from('veprimi')
      .insert([...rows, ...mirrorRows])
      .select('*')

    if (error) {
      reply.code(400)
      return { error: error.message }
    }

    return {
      data,
      meta: {
        mirrored_to_albania: mirrorRows.length > 0,
        mirrored_count: mirrorRows.length,
      },
    }
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

  type ProductExportRow = {
    kodi: string
    emri: string
    pershkrimi: string | null
    gjendje_kosove: number | null
    gjendje_shqiperi: number | null
  }

  type ActionExportRow = {
    id: string
    lloji: 'Hyrje' | 'Dalje'
    data: string
    shteti: 'XK' | 'AL'
    kodi_produktit: string
    cmimi_njesi: number | string
    sasia: number
    created_at: string
  }

  function signedQty(row: ActionExportRow) {
    const qty = Number(row.sasia ?? 0)
    return row.lloji === 'Dalje' ? -qty : qty
  }

  function isWithinExportRange(row: ActionExportRow, query: { from?: string; to?: string }) {
    if (query.from && row.data < query.from) return false
    if (query.to && row.data > query.to) return false
    return true
  }

  function transferKey(row: ActionExportRow) {
    return [
      row.data,
      row.kodi_produktit,
      String(row.cmimi_njesi),
      String(row.sasia),
    ].join('|')
  }

  function findExcelTemplatePath() {
    const candidates = [
      path.resolve(process.cwd(), 'docs/excel/Inventari Excel Template.xlsx'),
      path.resolve(process.cwd(), '../docs/excel/Inventari Excel Template.xlsx'),
      path.resolve(process.cwd(), '../../docs/excel/Inventari Excel Template.xlsx'),
    ]

    const templatePath = candidates.find((candidate) => fs.existsSync(candidate))
    if (!templatePath) {
      throw new Error('Excel template not found at docs/excel/Inventari Excel Template.xlsx')
    }
    return templatePath
  }

  async function loadInventariTemplateWorkbook() {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(findExcelTemplatePath())

    const sheet = workbook.getWorksheet('Sheet1') ?? workbook.worksheets[0]
    if (!sheet) throw new Error('Excel template does not contain a worksheet.')

    for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber)
      for (let col = 1; col <= 14; col += 1) {
        row.getCell(col).value = null
      }
    }

    return { workbook, sheet }
  }

  function writeInventariDataRow(
    sheet: ExcelJS.Worksheet,
    rowNumber: number,
    values: Array<string | number | null>,
  ) {
    const templateRow = sheet.getRow(3)
    const row = sheet.getRow(rowNumber)
    const dataBorder = {
      top: { style: 'thin', color: { argb: 'FFB7C9D9' } },
      left: { style: 'thin', color: { argb: 'FFB7C9D9' } },
      bottom: { style: 'thin', color: { argb: 'FFB7C9D9' } },
      right: { style: 'thin', color: { argb: 'FFB7C9D9' } },
    } as const

    row.height = templateRow.height
    for (let col = 1; col <= 14; col += 1) {
      const cell = row.getCell(col)
      cell.style = { ...templateRow.getCell(col).style }
      cell.border = dataBorder
      cell.value = values[col - 1] ?? null
    }

    for (const col of [5, 7, 11, 13]) {
      row.getCell(col).numFmt = '#,##0.00'
    }
    for (const col of [6, 8, 12, 14]) {
      row.getCell(col).numFmt = '#,##0'
    }

    return row
  }

  function clearInventariRowsAfterData(sheet: ExcelJS.Worksheet, firstEmptyRow: number) {
    for (let rowNumber = firstEmptyRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber)
      for (let col = 1; col <= 14; col += 1) {
        const cell = row.getCell(col)
        cell.value = null
        cell.style = {}
      }
    }
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

    const [{ data: products, error: productsError }, { data: allActions, error: actionsError }] =
      await Promise.all([
        supabase
          .from('produkti')
          .select('kodi,emri,pershkrimi,gjendje_kosove,gjendje_shqiperi')
          .order('emri', { ascending: true }),
        supabase
          .from('veprimi')
          .select('id,lloji,data,shteti,kodi_produktit,cmimi_njesi,sasia,created_at')
          .order('data', { ascending: true })
          .order('created_at', { ascending: true })
          .order('id', { ascending: true }),
      ])

    if (productsError) throw productsError
    if (actionsError) throw actionsError

    const productRows = (products ?? []) as ProductExportRow[]
    const actionRows = ((allActions ?? []) as ActionExportRow[]).sort((a, b) => {
      const dateDiff = a.data.localeCompare(b.data)
      if (dateDiff !== 0) return dateDiff
      const createdDiff = a.created_at.localeCompare(b.created_at)
      if (createdDiff !== 0) return createdDiff

      const aIsKosovoOut = a.shteti === 'XK' && a.lloji === 'Dalje'
      const bIsKosovoOut = b.shteti === 'XK' && b.lloji === 'Dalje'
      const aIsAlbaniaIn = a.shteti === 'AL' && a.lloji === 'Hyrje'
      const bIsAlbaniaIn = b.shteti === 'AL' && b.lloji === 'Hyrje'

      if (transferKey(a) === transferKey(b)) {
        if (aIsKosovoOut && bIsAlbaniaIn) return -1
        if (aIsAlbaniaIn && bIsKosovoOut) return 1
      }

      return a.id.localeCompare(b.id)
    })
    const productsByCode = new Map(productRows.map((p) => [p.kodi, p]))
    const mirrorCounts = new Map<string, number>()

    for (const action of actionRows) {
      if (action.shteti === 'XK' && action.lloji === 'Dalje') {
        const key = transferKey(action)
        mirrorCounts.set(key, (mirrorCounts.get(key) ?? 0) + 1)
      }
    }

    const currentStock = new Map<string, { XK: number; AL: number }>()
    const runningStock = new Map<string, { XK: number; AL: number }>()

    for (const p of productRows) {
      currentStock.set(p.kodi, {
        XK: Number(p.gjendje_kosove ?? 0),
        AL: Number(p.gjendje_shqiperi ?? 0),
      })
    }

    // Derive the stock at the beginning of history by reversing real DB movements.
    for (const action of actionRows) {
      const stock = currentStock.get(action.kodi_produktit)
      if (!stock) continue
      stock[action.shteti] -= signedQty(action)
    }

    for (const [kodi, stock] of currentStock) {
      runningStock.set(kodi, { ...stock })
    }

    const actionsThroughTo = actionRows.filter((action) => !query.to || action.data <= query.to)

    const { workbook, sheet } = await loadInventariTemplateWorkbook()
    let nextDataRow = 3

    for (const action of actionsThroughTo) {
      const product = productsByCode.get(action.kodi_produktit)
      const stock = runningStock.get(action.kodi_produktit)
      if (!product || !stock) continue

      const qty = signedQty(action)
      const unitPrice = Number(action.cmimi_njesi ?? 0)
      const key = transferKey(action)
      const isMirroredAlbaniaIn =
        action.shteti === 'AL' &&
        action.lloji === 'Hyrje' &&
        (mirrorCounts.get(key) ?? 0) > 0

      stock[action.shteti] += qty

      let rowValues: Array<string | number | null> | null = null

      if (isMirroredAlbaniaIn) {
        mirrorCounts.set(key, (mirrorCounts.get(key) ?? 1) - 1)
      } else if (isWithinExportRange(action, query)) {
        if (action.shteti === 'XK') {
          rowValues = [
            product.kodi,
            product.emri,
            product.pershkrimi ?? '',
            action.data,
            unitPrice,
            qty,
            unitPrice * qty,
            stock.XK,
            '',
            '',
            '',
            '',
            '',
            '',
          ]

          if (action.lloji === 'Dalje') {
            const alQty = Number(action.sasia ?? 0)
            rowValues[9] = action.data
            rowValues[10] = unitPrice
            rowValues[11] = alQty
            rowValues[12] = unitPrice * alQty
            rowValues[13] = stock.AL + alQty
          }
        } else if (action.shteti === 'AL') {
          rowValues = [
            product.kodi,
            product.emri,
            product.pershkrimi ?? '',
            '',
            '',
            '',
            '',
            '',
            '',
            action.data,
            unitPrice,
            qty,
            unitPrice * qty,
            stock.AL,
          ]
        }
      }

      if (rowValues) {
        writeInventariDataRow(sheet, nextDataRow, rowValues)
        nextDataRow += 1
      }
    }

    if (nextDataRow === 3) {
      writeInventariDataRow(sheet, nextDataRow, [
        '',
        'Nuk ka veprime per kete periudhe.',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ])
      nextDataRow += 1
    }

    clearInventariRowsAfterData(sheet, nextDataRow)

    const buf = await workbook.xlsx.writeBuffer()
    reply.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19).replaceAll(':', '-')
    reply.header('Content-Disposition', `attachment; filename="Permbledhje ${stamp}.xlsx"`)
    return buf
  })

  return app
}

