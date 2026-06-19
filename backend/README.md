# Inventari Backend

Fastify API for the Inventari inventory platform. Handles authentication, Supabase data access, action batches, analytics, and Excel exports.

## Stack

- Fastify 5 + TypeScript
- Supabase (service role, server-only)
- Zod validation via `@inventari/shared`
- ExcelJS for `.xlsx` exports
- Cookie-based HMAC sessions (no Supabase Auth in the browser)

## Setup

From the repository root:

```bash
npm install
cp backend/.env.example backend/.env
# set SUPABASE_URL, SUPABASE_SERVICE_KEY, login_email, login_password
npm -w backend run dev
```

API default: `http://localhost:3001`

## Scripts

| Command | Description |
| --- | --- |
| `npm -w backend run dev` | Start API with `tsx watch` |
| `npm -w backend run build` | Build shared package + compile TypeScript |
| `npm -w backend run start` | Run compiled `dist/index.js` |
| `npm -w backend run lint` | ESLint |
| `npm -w backend run test` | Vitest unit tests |

## Environment

Copy `backend/.env.example` to `backend/.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | yes | Service role key (secret) |
| `login_email` / `LOGIN_EMAIL` | yes | Admin login email |
| `login_password` / `LOGIN_PASSWORD` | yes | Admin login password |
| `SESSION_SECRET` | no | HMAC secret (min 32 chars); defaults to service key |
| `CORS_ORIGIN` | no | Allowed origin in production |
| `PORT` / `HOST` | no | Listen address (default `3001` / `0.0.0.0`) |

The repo root `.env` is also loaded by `index.ts` for convenience.

## Project structure

```text
backend/src/
  index.ts              Entry: env loading + listen
  app.ts                buildApp(): plugins, routes, static SPA fallback
  server.ts             Re-exports buildApp (compat)
  supabase.ts           Supabase admin client factory
  errors.ts             AppError, Zod/Supabase error mapping
  batchDomain.ts        Shared batch/mirror helpers (native + legacy)
  actionBatches.ts      /api/action-batches/* routes
  legacyBatches.ts      Pre-batch_id grouping and legacy IDs
  excel.ts              ExcelJS styling helpers (headers, borders, auto-size)
  auth/
    session.ts          Sign/verify session cookie
    routes.ts           login, logout, session
  plugins/
    auth.ts             preHandler: 401 on missing session
  routes/
    products.ts         /api/products CRUD
    actions.ts          POST/GET /api/actions
    analytics.ts        /api/analytics/stock, /summary
    exports.ts          CSV + products.xlsx + Permbledhje template xlsx
  services/
    productsService.ts
    actionsService.ts   Normalize, validate, stock check, row building
    exportsService.ts
    inventariExcel.ts   Template load, stock replay, 13-column Permbledhje rows
packages/shared/        Zod schemas, productLabel, buildSummaryByCountry, ERR_* messages
```

## API overview

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| POST | `/api/login` | Set session cookie (rate-limited) |
| POST | `/api/logout` | Clear session |
| GET | `/api/session` | `{ ok: boolean }` |
| GET/POST/PATCH/DELETE | `/api/products`, `/api/products/:id` | Product CRUD |
| POST/GET | `/api/actions` | Create action batch or list raw `veprimi` rows |
| GET/PATCH/DELETE | `/api/action-batches/*` | Historiku batches (native + legacy IDs) |
| GET | `/api/analytics/summary` | Hyrje/Dalje totals by country for date range |
| GET | `/api/analytics/stock` | Stock list filtered by country |
| GET | `/api/exports/products.xlsx` | Product export |
| GET | `/api/exports/actions.xlsx` | Permbledhje export (13-column template) |
| GET | `/api/exports/actions.csv` | Raw actions CSV |

Protected routes require the `inventari_session` cookie except login, logout, session, and health.

## Key behavior

### Actions (`POST /api/actions`)

- Accepts a batch (`items[]`) or single-product body (normalized in `@inventari/shared`).
- **Transfer:** creates `Dalje` rows for source + `Hyrje` for destination; validates stock in one query.
- **Kosovo Dalje:** optionally mirrors `Hyrje` into Albania (same as before).
- Assigns `batch_id` via `veprim_batch` (requires `docs/sql/05_veprim_batch.sql`).

### Historiku (`/api/action-batches`)

- Lists grouped batches with pagination and filters.
- Supports **legacy** batch IDs (`legacy:…`) for rows created before `batch_id`.
- Edit/delete updates sibling rows for transfers and mirrored Kosovo Dalje.

### Permbledhje Excel

- Template: `docs/excel/Inventari Excel Template.xlsx`
- **13 columns:** Kodi, Produkti, Kosova (5 cols), spacer, Shqiperi (5 cols)
- Stock replay derives opening balances from current stock + full history

## Database

SQL migrations live in `docs/sql/`:

| File | Purpose |
| --- | --- |
| `01_tables.sql` | Core tables |
| `02_stock_trigger.sql` | Stock update triggers |
| `03_migrate_produkti_two_stocks.sql` | Two-country stock columns |
| `04_drop_produkti_pershkrimi.sql` | Remove Përshkrimi column |
| `05_veprim_batch.sql` | `veprim_batch` + batch triggers (required for Historiku) |
| `06_veprim_batch_ora_pershkrimi.sql` | Optional `ora` + `pershkrimi` on `veprim_batch` |

## Tests

```bash
npm -w backend run test
```

Covers `actionsService`, `inventariExcel` helpers, and `legacyBatches` ID grouping. Shared analytics/format tests run via `npm -w @inventari/shared run test`.

## Production

- `npm run build` compiles backend to `backend/dist/`.
- If `frontend/dist` exists, the API serves the SPA and falls back to `index.html` for non-API GET routes.
- Set `SESSION_SECRET` explicitly in production; do not rely on the Supabase key fallback.

## Related docs

- [Frontend UI and product behavior](../frontend/README.md)
- [Repo root quick start](../README.md)
- [Local development](../docs/local-dev.md)
- [Render deployment](../docs/render.md)
