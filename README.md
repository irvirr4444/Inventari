# Inventari

Inventory management for products tracked across Kosovo and Albania. The repo is an npm workspace with a Fastify backend and a React frontend.

**Multi-tenancy:** each account owns its own products and history. The original single-user deployment runs as a **legacy** account (`ui_lloji = legacy_fixed`) with the same Kosovo/Albania UI as before. New signups get a **dynamic** account with configurable locations.

## Quick start

### 1) Install and env

```bash
npm install
cp backend/.env.example backend/.env   # or copy from repo root .env.example
cp frontend/.env.example frontend/.env
```

Set in `backend/.env` (or repo root `.env`):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `login_email` / `login_password` — legacy admin login (existing deployment)
- `SESSION_SECRET` — min 32 random characters (recommended in production)

### 2) Database (Supabase SQL Editor)

Run migrations **in order** for a fresh project:

| Order | File | Purpose |
| --- | --- | --- |
| 1–6 | `docs/sql/01_tables.sql` … `06_veprim_batch_ora_pershkrimi.sql` | Core schema, batches, optional Ora/Pershkrimi |
| 7 | `docs/sql/07_perdorues_lokacioni.sql` | Users + locations tables, placeholder legacy user |
| 8–11 | `docs/sql/APPLY_08_through_11.sql` | Tenant columns, `gjendje`, stock triggers (safe to re-run) |

**Existing database** that already has products: run `07`, then `APPLY_08_through_11.sql` (does not delete rows — wrapped in a transaction with row-count checks).

**One-time** after migration 07:

```bash
npm run seed:legacy-user -w backend
```

Sets the legacy user's email/password from `.env`. You do **not** run this on every backend start.

Verify schema:

```bash
npm run diagnose:tenant -w backend
```

Optional CLI migration (instead of pasting SQL): set `DATABASE_URL` in `.env`, then `npm run apply:tenant-migrations -w backend`.

### 3) Run

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Vite proxies `/api` to the backend during local development

Log in with `login_email` / `login_password` for the legacy account, or use **Regjistrohu** (`/signup`) for a new dynamic account.

## Workspaces

| Package | Path | Description |
| --- | --- | --- |
| `backend` | `backend/` | Fastify API, Supabase access, auth, Excel exports |
| `frontend` | `frontend/` | React dashboard + mobile UI |
| `@inventari/shared` | `packages/shared/` | Zod schemas, shared types, `productLabel`, summary builders |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start backend and frontend together |
| `npm run build` | Build backend and frontend |
| `npm run lint` | Lint both workspaces |
| `npm run test` | Run shared + backend unit tests |
| `npm run seed:legacy-user -w backend` | One-time: set legacy login from `.env` |
| `npm run diagnose:tenant -w backend` | Check migrations / tenant data |
| `npm run apply:tenant-migrations -w backend` | Apply 08–11 via `DATABASE_URL` (optional) |

## Environment

### Backend (`backend/.env` or repo root `.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | yes | Service role key (server-only; keep secret) |
| `login_email` / `LOGIN_EMAIL` | legacy setup | Admin email for existing deployment |
| `login_password` / `LOGIN_PASSWORD` | legacy setup | Admin password |
| `SESSION_SECRET` | prod recommended | HMAC session secret (min 32 chars) |
| `GOOGLE_CLIENT_ID` | no | Enables `POST /api/auth/google` |
| `DATABASE_URL` | no | Postgres URI for `apply:tenant-migrations` only |
| `CORS_ORIGIN` | no | Allowed origin (default `http://localhost:5173`) |
| `PORT` | no | API port (default `3001`) |

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=/api
```

The browser does not use Supabase keys directly. All data goes through the backend API with cookie-based sessions.

## Documentation

- **Frontend UI and product behavior:** [frontend/README.md](frontend/README.md)
- **Backend API and architecture:** [backend/README.md](backend/README.md)
- **Local development:** [docs/local-dev.md](docs/local-dev.md)
- **Deploy (Render):** [docs/render.md](docs/render.md)
- **SQL migrations:** [docs/sql/](docs/sql/)
- **Multi-tenancy plan:** [MULTI_TENANCY_PLAN.md](MULTI_TENANCY_PLAN.md)

## Features

- Product stock for Kosovo and Albania (legacy) or N configurable locations (dynamic accounts)
- Email/password login, signup, optional Google sign-in
- `Hyrje` and `Dalje` actions with automatic totals; optional batch **Ora** (time) and **Pershkrimi** (description)
- Country-to-country transfers via a dedicated modal (same optional metadata)
- **Historiku** — view, filter (server + client-side Ora/Pershkrimi/Totali/Produkte), edit (including add/remove product lines on mobile), delete past actions; pre-batch rows auto-migrate on save; success snackbars; product labels `Emri (Kodi)` (requires `docs/sql/05_veprim_batch.sql`; Ora/Pershkrimi require `docs/sql/06_veprim_batch_ora_pershkrimi.sql`)
- Product search by code or name; product pickers sorted by code
- Sortable products table and date-range summary panel (transfers count as Hyrje/Dalje per country)
- Formatted Excel exports: products list + Permbledhje template (**13 columns**, no Përshkrimi, auto-sized columns)
