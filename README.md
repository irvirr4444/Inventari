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
| 13 | `docs/sql/13_perdorues_emri_unique.sql` | Emri-based auth: unique names, nullable email for password sign-ups |
| 14 | `docs/sql/14_tenant_config.sql` | `tenant_config` table (initial); backfill for existing dynamic users |
| 15 | `docs/sql/15_tenant_config_v2.sql` | V2 config: `tutorial_seen`, rename `onboarding_complete`, drop unit columns, RLS |
| 18 | `docs/sql/18_user_roles_location_access.sql` | Admin/Përdorues roles, account ownership, and per-location access |

**Existing database** that already has products: run `07`, then `APPLY_08_through_11.sql`, then `13_perdorues_emri_unique.sql`, then `14_tenant_config.sql`, then `15_tenant_config_v2.sql`, then `18_user_roles_location_access.sql` (does not delete rows — wrapped in a transaction with row-count checks where applicable).

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

Log in at **`/login`**:

- **Legacy admin (existing deployment):** use **Hyr** with `login_email` / `login_password` from `.env` (email in the Emri field works), or sign in as **`Legacy User`** with the same password.
- **New dynamic account:** use **Regjistrohu** with a unique **Emri** + password (min 8 characters), then complete the onboarding wizard at `/onboarding`.
- Optional **Google sign-in** when `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` are set (see [Environment](#environment)).

Do **not** use **Regjistrohu** with an email address — that creates a new account and sends you to onboarding instead of the legacy dashboard.

## Workspaces

| Package | Path | Description |
| --- | --- | --- |
| `backend` | `backend/` | Fastify API, Supabase access, auth, Excel/PDF/DOCX exports |
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
| `GOOGLE_CLIENT_ID` | no | Enables `POST /api/auth/google` (must match frontend `VITE_GOOGLE_CLIENT_ID`) |
| `DATABASE_URL` | no | Postgres URI for `apply:tenant-migrations` only |
| `CORS_ORIGIN` | no | Allowed origin (default `http://localhost:5173`) |
| `PORT` | no | API port (default `3001`) |

### Frontend (`frontend/.env` or repo root `.env`)

Vite loads env from the **repository root** (`frontend/vite.config.ts` `envDir`). You can use a single root `.env` or `frontend/.env`.

```env
VITE_API_BASE_URL=/api

# Same Web client ID as backend GOOGLE_CLIENT_ID (optional; hides Google button if unset)
VITE_GOOGLE_CLIENT_ID=
```

The browser does not use Supabase keys directly. All data goes through the backend API with cookie-based sessions (`credentials: 'include'`).

## Documentation

- **Frontend UI:** [frontend/README.md](frontend/README.md) — setup, auth, API; links to [desktop](frontend/README-DESKTOP.md) and [mobile](frontend/README-MOBILE.md) UI docs
- **Backend API and architecture:** [backend/README.md](backend/README.md)
- **Android APK:** [docs/android-apk.md](docs/android-apk.md) — Capacitor shell in `android-shell/`; run `npm run android:sync` then `npm run android:open`
- **Local development:** [docs/local-dev.md](docs/local-dev.md)
- **Deploy (Render):** [docs/render.md](docs/render.md)
- **SQL migrations:** [docs/sql/](docs/sql/)
- **Onboarding wizard & tenant config (V2 spec):** [onboarding_revamp.md](onboarding_revamp.md)

## Features

### Accounts

- **Legacy** (`ui_lloji = legacy_fixed`): Kosovo + Albania UI, `gjendje_kosove` / `gjendje_shqiperi` on products, country-based actions and summary.
- **Dynamic** (new sign-ups): custom locations; onboarding wizard collects location count/names + price tracking (`tenant_config.track_price`); dashboard hides price/total UI when `track_price = false`. Admins can manage other users from the top-right settings modal with Admin/Përdorues roles and per-location access.

### Auth & core flows

- **Emri** + password login and sign-up on one screen (`/login`); legacy users can also sign in with their email in the Emri field; errors as a **red snackbar** at the bottom of the screen; optional Google sign-in
- **Dynamic onboarding wizard** (`/onboarding`): five screens — welcome → location count (1–20) → all location name rows with emoji picker → pricing (Me çmime / Vetëm sasi) → confirm. Navy/blue app styling (`styles/features/onboarding-wizard.css`). **← Kthehu** on every step after welcome; **Kthehu te hyrja** on welcome logs out. Saves `track_price` on screen 4, creates locations + `onboarding_complete` on confirm.
- **Post-onboarding tutorial** (desktop + mobile): one-time spotlight overlay; persisted in `tenant_config.tutorial_seen` via `POST /api/tenant-config/tutorial-seen` (not localStorage)
- Location `kodi` is server-derived (UI shows emoji + name only); manage users and locations from the top-right settings modal. Location delete is a soft delete: it hides/deactivates the location for future work while preserving historical data.
- `Hyrje` and `Dalje` with automatic totals; optional batch **Ora** and **Pershkrimi**
- Transfers between countries (legacy) or between any two locations (dynamic)
- **Historiku** — paginated batches, server filters (type, date range) + client filters (location checkboxes for dynamic, Ora range, Pershkrimi, Totali, Produkte); invalid min/max ranges blocked with snackbar feedback; edit and delete with stock rollback
- **Historiku exports** — single **Shkarko** dropdown (Excel `.xlsx`, PDF `.pdf`, Word `.docx`) on desktop and mobile; exports respect **all** active filters (server + client), not just type/location. Optional A4 print preview at `/history/print` (toolbar: **Mbyll**, **Shkarko** PDF, **Printo**)
- Product search by code or name; sortable products table; date-range summary panel (`DateRangeInput` on desktop, `MobileDateRangeInput` on mobile — per-field pickers auto-swap when **Nga** would be after **Deri**)

### Exports

| Export | Legacy | Dynamic |
| --- | --- | --- |
| Products `.xlsx` | Kodi, Emri, Gjendje Kosove, Gjendje Shqiperi | Kodi, Emri, one column per location |
| Përmbledhje `.xlsx` | 13-column template (Kosova + Shqiperi blocks) | **Veprime** + **Përmbledhje** sheets; omits price/value columns when `track_price = false` |
| Historiku `.xlsx` / `.pdf` / `.docx` | Filtered action batches via **Shkarko** dropdown (card layout for PDF/Word; Excel uses legacy/dynamic templates) | Same; location filter + `track_price` respected server-side |

Historiku file downloads use `POST /api/exports/history.{xlsx,pdf,docx}` with `batchIds` plus full filter metadata (`filterLines`, client ora/totali/produkte bounds, etc.) after the frontend applies the same client filters as the UI. PDF and Word use the same card-per-action layout as the print preview (24-hour timestamps; no username in the report header). The print preview route is `/history/print` (query params mirror active filters).

### Desktop vs mobile

- **Legacy:** full desktop (`DashboardPage`) + mobile (`src/mobile/MobileApp.tsx`) for Kosovo/Albania.
- **Dynamic:** full desktop (`DynamicDashboardPage`) + purpose-built mobile tabs (`src/features/dynamic/mobile/`) with the same five bottom tabs as legacy. Dynamic mobile Produkte shows all location stock inline on each product card; header and bottom nav share the `--surface` theme.
- **Përmbledhje on mobile:** bottom **Përmbledhje** tab (not a separate route). Dynamic accounts get per-location **Hyrje/Dalje sasi and vlerë** for every `show_in_summary` location, including zeros when the date range has no activity; legacy shows Kosovo + Albania blocks with the same four metrics.
- **Mobile sheets & overlays:** date/time pickers slide up from the bottom (`DatePickerSheet`, `DateRangePickerSheet`, `TimePickerSheet`). **Nga** / **Deri** date fields open the calendar for that bound only; if the chosen date would invert the range, values swap automatically. Dismiss by tapping the dimmed backdrop closes the sheet/modal without triggering buttons underneath (`lib/pointerDismissGuard.ts`).
- **Histori tab (mobile):** structured action cards (`MobileHistoriActionCard`); sticky footer with **Shkarko** dropdown (~30%) + compact pagination (~70%); same filtered export scope as desktop.
- **Transfer tab (mobile):** `Nga` / `Te` and **Data** / **Ora** use two-column `mobile-field-row` layouts (half width each).
