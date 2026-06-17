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

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start backend and frontend together |
| `npm run build` | Build backend and frontend |
| `npm run lint` | Lint both workspaces |

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
- **Transfer workflow:** handled entirely in the **Transfero** popup on the dashboard (`Hyrje` / `Dalje` stay on the main action card)

## Features

- Product stock for Kosovo and Albania
- `Hyrje` and `Dalje` actions with automatic totals
- Country-to-country transfers via a dedicated modal
- Sortable products table and date-range summary panel
- Formatted Excel exports for products and summaries
