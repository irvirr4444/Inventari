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
| `GOOGLE_CLIENT_ID` | no | Enables Google sign-in; must match frontend `VITE_GOOGLE_CLIENT_ID` |
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
  domain/               User, lokacioni, tenant types; lokacioniKodi (derive/dedupe)
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
| POST | `/api/auth/google` | Google ID token login (requires `GOOGLE_CLIENT_ID`; body `{ id_token }`) |
| POST | `/api/logout` | Clear session |
| GET | `/api/session` | `{ ok, user }` with `uiLloji`, `isLegacy`, `has_locations` |
| GET/POST/PATCH/DELETE | `/api/lokacionet` | Location CRUD (dynamic). Create: `emri`, optional `flag_emoji` (defaults 📍), optional `rradhitja`; `kodi` derived server-side. PATCH: no client `kodi` (regenerated when `emri` changes). |
| GET/POST/PATCH/DELETE | `/api/products`, `/api/products/:id` | Product CRUD. Legacy PATCH: `gjendje_kosove` / `gjendje_shqiperi`. Dynamic PATCH: `stock: [{ lokacioni_id, sasia }]` updates `gjendje` only (not a `produkti` column). List returns legacy columns or `stock[]`. |
| POST/GET | `/api/actions` | Create batch or list raw `veprimi`. Legacy body: `shteti`. Dynamic body: `lokacioni_id` (+ `destination_lokacioni_id` for Transfer). |
| GET/PATCH/DELETE | `/api/action-batches/*` | Historiku. Responses include `lokacioni_id`, optional `lokacioni_emri` / emoji (dynamic). PATCH accepts `lokacioni_id` for dynamic users. |
| POST/PATCH/DELETE | `/api/action-batches/:id/items/*` | Add, update, or remove product lines on a batch |
| GET | `/api/analytics/summary` | Hyrje/Dalje totals — `SummaryByCountry` (legacy) or `SummaryByLocation` keyed by `lokacioni_id` (dynamic, `show_in_summary` locations) |
| GET | `/api/analytics/stock` | Stock list filtered by country (legacy) |
| GET | `/api/exports/products.xlsx` | Product export |
| GET | `/api/exports/actions.xlsx` | Permbledhje export |
| GET | `/api/exports/actions.csv` | Raw actions CSV |

Protected routes require the `inventari_session` cookie except login, signup, google, logout, session, and health.

### Auth errors (login / signup / Google)

| Status | Message | When |
| --- | --- | --- |
| 401 | `Invalid credentials` | Wrong email/password |
| 401 | `Account created with Google` | Password login for a Google-only account |
| 401 | `Invalid Google token` | Bad or expired Google ID token |
| 409 | `Email already registered` | Sign-up with existing email |
| 503 | `Google sign-in is not configured` | `GOOGLE_CLIENT_ID` unset |

Password login calls `ensureLegacyUserSeeded` once when the legacy user still has a placeholder email or no password hash. Google login links `google_sub` on an existing email match or creates a new dynamic user.

## Multi-tenancy

- All product/action/batch queries filter by `pronari_id` (owner user id).
- **Legacy user** (`ui_lloji = legacy_fixed`, fixed id `00000000-0000-4000-8000-000000000001`): existing data backfilled to this id; API returns Kosovo/Albania columns unchanged; Kosovo `Dalje` still mirrors to Albania.
- **Dynamic users**: configurable `lokacioni` rows (`flag_emoji`, `show_in_summary`), `gjendje` stock table, location-based actions and exports. Internal `kodi` is auto-derived from `emri` on create/rename (collision suffixes `TIR`, `TIR2`, …).

Session payload includes `uiLloji`, `isLegacy`, and `has_locations` so the frontend can branch UI and gate onboarding.

### Locations (`/api/lokacionet`)

- `lokacioniService` + `domain/lokacioniKodi.ts` — derive base code (3 letters from name, fallback `LOC`), dedupe per owner, regenerate on rename.
- Deactivating a location with stock returns an optional `stock_warning` in the PATCH response (UI may alert).

## Key behavior

### Actions (`POST /api/actions`)

- Accepts a batch (`items[]`) or single-product body (normalized in `@inventari/shared`).
- **Legacy:** `shteti` / `destination_shteti`; Kosovo `Dalje` can mirror `Hyrje` into Albania.
- **Dynamic:** `lokacioni_id` / `destination_lokacioni_id`; stock validation uses `gjendje` for the source location.
- **Transfer:** `Dalje` at source + `Hyrje` at destination (one stock check on source).
- Assigns `batch_id` via `veprim_batch` (requires `docs/sql/05_veprim_batch.sql`).

### Historiku (`/api/action-batches`)

- Lists grouped batches with pagination and filters (type, date; legacy also filters `shteti`).
- Batch payloads include `lokacioni_id`, `destination_lokacioni_id`, and resolved location labels for dynamic tenants.
- Supports **legacy** batch IDs (`legacy:…`) until first edit migrates to `veprim_batch`.
- PATCH meta: `shteti` (legacy) or `lokacioni_id` / `destination_lokacioni_id` (dynamic); updates sibling `veprimi` rows for transfers.
- Item POST/PATCH/DELETE for add/remove/edit product lines.

### Permbledhje Excel

- **Legacy:** template `docs/excel/Inventari Excel Template.xlsx` — 13 columns (Kosova + Shqiperi blocks); stock replay from history.
- **Dynamic:** generated workbook with:
  - **Veprime** — movement lines (Data, Lloji, Lokacioni, Kodi, Cmimi, Sasia, Totali)
  - **Permbledhje** — per-location Hyrje/Dalje totals for the date range (`buildSummaryByLocation`)
- Products export: legacy two stock columns vs dynamic N location columns.

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

Covers `actionsService`, `inventariExcel`, `legacyBatches`, `lokacioniKodi`, and tenant isolation guards. Shared analytics/format tests: `npm -w @inventari/shared run test`.

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
