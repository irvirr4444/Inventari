## Render deployment (skeleton)

This repo includes a `render.yaml` blueprint with two services:
- `inventari-backend` (Node web service)
- `inventari-frontend` (static site)

### Backend env vars (Render dashboard)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (server-only secret)
- `CORS_ORIGIN` (your frontend URL on Render)

### Frontend env vars (Render dashboard)
- `VITE_API_BASE_URL` (your backend URL on Render + `/api`)

### Notes
- For local dev, Vite proxies `/api` to `http://localhost:3001` (see `frontend/vite.config.ts`).
- For correctness with OUT actions, enable the DB trigger in `docs/sql/02_stock_trigger.sql`.

