## Render deployment (skeleton)

This repo includes a `render.yaml` blueprint with two services:
- `inventari-backend` (Node web service)
- `inventari-frontend` (static site)

### Backend env vars (Render dashboard)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (server-only secret)
- `SESSION_SECRET` (min 32 random characters)
- `CORS_ORIGIN` (your frontend URL on Render, e.g. `https://inventari-frontend.onrender.com`)
- `login_email` / `login_password` (legacy admin; run `seed:legacy-user` after deploy if needed)
- `GOOGLE_CLIENT_ID` (optional; same Web client ID as frontend)

### Frontend env vars (Render dashboard)
- `VITE_API_BASE_URL` (your backend URL on Render + `/api`)
- `VITE_GOOGLE_CLIENT_ID` (optional; must match backend `GOOGLE_CLIENT_ID`)

Add production frontend URL to Google Cloud **Authorized JavaScript origins** (`https://…`, no trailing slash).

### Notes
- For local dev, Vite proxies `/api` to `http://localhost:3001` (see `frontend/vite.config.ts`). Vite loads `VITE_*` from the repo root `.env`.
- Auth UI: single `/login` card (Hyr / Regjistrohu + optional Google); `/signup` redirects to `/login?mode=signup`.
- For correctness with OUT actions, enable the DB trigger in `docs/sql/02_stock_trigger.sql`.

