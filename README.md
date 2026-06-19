# Inventari

Inventory management for products tracked across Kosovo and Albania. The repo is an npm workspace with a Fastify backend and a React frontend.

## Quick start

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Vite proxies `/api` to the backend during local development

## Workspaces

| Package | Path | Description |
| --- | --- | --- |
| `backend` | `backend/` | Fastify API, Supabase access, Excel exports |
| `frontend` | `frontend/` | React dashboard UI |
| `@inventari/shared` | `packages/shared/` | Zod schemas, shared types, `productLabel`, `buildSummaryByCountry` |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start backend and frontend together |
| `npm run build` | Build backend and frontend |
| `npm run lint` | Lint both workspaces |
| `npm run test` | Run shared + backend unit tests |

## Environment

### Backend (`backend/.env`)

Copy from `backend/.env.example` and set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (server-only; keep secret)

### Frontend (`frontend/.env`)

Copy from `frontend/.env.example`:

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

## Features

- Product stock for Kosovo and Albania
- `Hyrje` and `Dalje` actions with automatic totals; optional batch **Ora** (time) and **Pershkrimi** (description)
- Country-to-country transfers via a dedicated modal (same optional metadata)
- **Historiku** — view, filter (server + client-side Ora/Pershkrimi/Totali/Produkte), edit, delete past actions; success snackbars; product labels `Emri (Kodi)` (requires `docs/sql/05_veprim_batch.sql`; Ora/Pershkrimi require `docs/sql/06_veprim_batch_ora_pershkrimi.sql`)
- Product search by code or name; product pickers sorted by code
- Sortable products table and date-range summary panel (transfers count as Hyrje/Dalje per country)
- Formatted Excel exports: products list + Permbledhje template (**13 columns**, no Përshkrimi, auto-sized columns)
