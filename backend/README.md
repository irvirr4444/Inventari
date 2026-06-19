# Inventari Backend

Fastify API for the Inventari inventory platform. Handles authentication, tenant-scoped Supabase access, action batches, analytics, and Excel exports.

## Stack

- Fastify 5 + TypeScript
- Supabase (service role, server-only)
- Zod validation via `@inventari/shared`
- bcrypt password hashing
- ExcelJS for `.xlsx` exports
- Cookie-based HMAC sessions (`inventari_session`); optional Google ID token login

## Setup

From the repository root:

```bash
npm install
cp backend/.env.example backend/.env
# Set SUPABASE_URL, SUPABASE_SERVICE_KEY, login_email, login_password, SESSION_SECRET
```

### Database (first time or upgrade)

1. Run SQL migrations in Supabase SQL Editor — see [Database](#database) below.
2. One-time legacy login setup:

```bash
npm run seed:legacy-user -w backend
```

3. Verify:

```bash
npm run diagnose:tenant -w backend
```

4. Start the API:

```bash
npm -w backend run dev
```

Default: `http://localhost:3001`

You do **not** need to run the seed script every time you start the backend. It only updates the legacy user when email is still `legacy@pending.migration` or password is unset. Login also calls the same helper once in that case.

## Scripts

| Command | Description |
| --- | --- |
| `npm -w backend run dev` | Start API with `tsx watch` |
| `npm -w backend run build` | Build shared package + compile TypeScript |
| `npm -w backend run start` | Run compiled `dist/index.js` |
| `npm -w backend run lint` | ESLint |
| `npm -w backend run test` | Vitest unit tests |
| `npm run seed:legacy-user -w backend` | One-time: sync legacy email/password from `.env` |
| `npm run diagnose:tenant -w backend` | Report schema + row counts for legacy tenant |
| `npm run apply:tenant-migrations -w backend` | Apply `docs/sql/APPLY_08_through_11.sql` via `DATABASE_URL` |

## Environment

Copy `backend/.env.example` to `backend/.env` (repo root `.env` is also loaded by `index.ts`):

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | yes | Service role key (secret) |
| `login_email` / `LOGIN_EMAIL` | legacy | Admin email (seed + first login) |
| `login_password` / `LOGIN_PASSWORD` | legacy | Admin password |
| `SESSION_SECRET` | prod recommended | HMAC secret (min 32 chars); defaults to service key if unset |
| `GOOGLE_CLIENT_ID` | no | Enables Google sign-in route |
| `DATABASE_URL` | no | Postgres URI for CLI migration script only |
| `CORS_ORIGIN` | no | Allowed origin in production |
| `PORT` / `HOST` | no | Listen address (default `3001` / `0.0.0.0`) |

## Project structure

```text
backend/src/
  index.ts              Entry: env loading + listen
  app.ts                buildApp(): plugins, routes, static SPA fallback
  supabase.ts           Supabase admin client factory
  errors.ts             AppError, Zod/Supabase error mapping
  domain/               User, lokacioni, tenant types
  repositories/         Tenant-scoped DB access (produkti, veprimi, batch, perdorues, lokacioni)
  services/
    authService.ts      Login, signup, Google, legacy seed helper
    productsService.ts  Product CRUD + legacy/dynamic DTO mapping
    actionsService.ts   Normalize, validate, stock check, row building
    lokacioniService.ts Location CRUD
    exportsService.ts   CSV + Excel (legacy vs dynamic templates)
    legacyDtoService.ts Legacy XK/AL response shape
    inventariExcel.ts   Template load, stock replay, Permbledhje rows
  auth/
    password.ts         bcrypt hash/verify
    session.ts          Sign/verify session cookie
    routes.ts           login, logout, session, signup, google
  plugins/
    auth.ts             preHandler: loads req.user from session
  routes/
    products.ts         /api/products CRUD
    actions.ts          POST/GET /api/actions
    analytics.ts        /api/analytics/stock, /summary
    exports.ts          CSV + products.xlsx + Permbledhje template xlsx
    lokacionet.ts       /api/lokacionet CRUD
  actionBatches.ts      /api/action-batches/* routes
  legacyBatches.ts      Pre-batch_id grouping and legacy IDs
  batchDomain.ts        Shared batch/mirror helpers
  excel.ts              ExcelJS styling helpers
  tenant/               Isolation tests + scope guard
packages/shared/        Zod schemas, productLabel, buildSummaryByCountry/Location
backend/scripts/
  seed-legacy-user.ts
  diagnose-tenant.ts
  apply-tenant-migrations.ts
```

## API overview

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| POST | `/api/login` | Email/password login → session cookie (rate-limited) |
| POST | `/api/auth/signup` | Create dynamic account |
| POST | `/api/auth/google` | Google ID token login (requires `GOOGLE_CLIENT_ID`) |
| POST | `/api/logout` | Clear session |
| GET | `/api/session` | `{ ok, user }` with `uiLloji`, `isLegacy`, `has_locations` |
| GET/POST/PATCH/DELETE | `/api/products`, `/api/products/:id` | Product CRUD (tenant-scoped) |
| POST/GET | `/api/actions` | Create action batch or list raw `veprimi` rows |
| GET/PATCH/DELETE | `/api/action-batches/*` | Historiku batches (native + legacy IDs) |
| POST/PATCH/DELETE | `/api/action-batches/:id/items/*` | Add, update, or remove product lines on a batch |
| GET/POST/PATCH/DELETE | `/api/lokacionet` | Location CRUD (dynamic accounts) |
| GET | `/api/analytics/summary` | Hyrje/Dalje totals for date range (by country or location) |
| GET | `/api/analytics/stock` | Stock list filtered by country (legacy) |
| GET | `/api/exports/products.xlsx` | Product export |
| GET | `/api/exports/actions.xlsx` | Permbledhje export |
| GET | `/api/exports/actions.csv` | Raw actions CSV |

Protected routes require the `inventari_session` cookie except login, signup, google, logout, session, and health.

## Multi-tenancy

- All product/action/batch queries filter by `pronari_id` (owner user id).
- **Legacy user** (`ui_lloji = legacy_fixed`, fixed id `00000000-0000-4000-8000-000000000001`): existing data backfilled to this id; API returns Kosovo/Albania columns unchanged; Kosovo `Dalje` still mirrors to Albania.
- **Dynamic users**: configurable `lokacioni` rows, `gjendje` stock table, location-based actions and exports.

Session payload includes `uiLloji`, `isLegacy`, and `has_locations` so the frontend can branch UI and gate onboarding.

## Key behavior

### Actions (`POST /api/actions`)

- Accepts a batch (`items[]`) or single-product body (normalized in `@inventari/shared`).
- **Transfer:** creates `Dalje` rows for source + `Hyrje` for destination; validates stock in one query.
- **Kosovo Dalje (legacy):** optionally mirrors `Hyrje` into Albania.
- Assigns `batch_id` via `veprim_batch` (requires `docs/sql/05_veprim_batch.sql`).

### Historiku (`/api/action-batches`)

- Lists grouped batches with pagination and filters.
- Supports **legacy** batch IDs (`legacy:…`) for rows created before `batch_id` (read-only grouping until first edit).
- Any PATCH/POST/DELETE on a legacy batch **migrates** it to `veprim_batch` and returns `batch_id` when applicable.
- Edit/delete updates sibling rows for transfers and mirrored Kosovo Dalje; item POST/DELETE handle add/remove product lines.

### Permbledhje Excel

- Template: `docs/excel/Inventari Excel Template.xlsx`
- **Legacy:** 13 columns — Kodi, Produkti, Kosova (5 cols), spacer, Shqiperi (5 cols)
- **Dynamic:** N-location export (see `exportsService.ts`)
- Stock replay derives opening balances from current stock + full history

## Database

SQL migrations live in `docs/sql/`. Run in order.

| File | Purpose |
| --- | --- |
| `01_tables.sql` | Core `produkti`, `veprimi` |
| `02_stock_trigger.sql` | Stock update triggers |
| `03_migrate_produkti_two_stocks.sql` | Two-country stock columns |
| `04_drop_produkti_pershkrimi.sql` | Remove Përshkrimi column |
| `05_veprim_batch.sql` | `veprim_batch` + batch triggers (required for Historiku) |
| `06_veprim_batch_ora_pershkrimi.sql` | Optional `ora` + `pershkrimi` on `veprim_batch` |
| `07_perdorues_lokacioni.sql` | `perdorues`, `lokacioni`, placeholder legacy user |
| `08_pronari_id.sql` | `pronari_id` on tenant tables, per-tenant product codes |
| `09_gjendje.sql` | `gjendje` stock table + legacy XK/AL locations |
| `10_veprimi_lokacioni.sql` | `lokacioni_id` on `veprimi` / `veprim_batch` |
| `11_stock_trigger_gjendje.sql` | Dual-write triggers (`gjendje` + legacy columns) |
| `APPLY_08_through_11.sql` | **Combined 08–11** for upgrades; transaction + row-count safety |

**Upgrading an existing database:** run `07`, then `APPLY_08_through_11.sql`, then `npm run seed:legacy-user -w backend`. The combined script does not delete `produkti`, `veprimi`, or `veprim_batch` rows.

## Tests

```bash
npm -w backend run test
```

Covers `actionsService`, `inventariExcel`, `legacyBatches`, and tenant isolation guards. Shared analytics/format tests: `npm -w @inventari/shared run test`.

## Production

- `npm run build` compiles backend to `backend/dist/`.
- If `frontend/dist` exists, the API serves the SPA and falls back to `index.html` for non-API GET routes.
- Set `SESSION_SECRET` explicitly in production; do not rely on the Supabase key fallback.

## Related docs

- [Frontend UI and product behavior](../frontend/README.md)
- [Repo root quick start](../README.md)
- [Local development](../docs/local-dev.md)
- [Render deployment](../docs/render.md)
- [Multi-tenancy plan](../MULTI_TENANCY_PLAN.md)
