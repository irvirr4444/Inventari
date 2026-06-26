# Inventari — Render deployment

Production uses a **single** Render web service: **`inventari-frontend`** at `https://inventari-frontend.onrender.com`.

That service runs the Node backend (API under `/api`) and serves the built React app from `frontend/dist`. There is no separate `inventari-backend` service in production.

## Render dashboard env vars (`inventari-frontend`)

**Server (required)**

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SESSION_SECRET` (min 32 random characters)
- `CORS_ORIGIN` — e.g. `https://inventari-frontend.onrender.com` (backend also allows `https://localhost` for the Android APK)
- `login_email` / `login_password` (legacy admin)
- `GOOGLE_CLIENT_ID` (optional; same Web client ID as frontend)

**Build-time (frontend)**

- `VITE_API_BASE_URL` — `https://inventari-frontend.onrender.com/api`
- `VITE_GOOGLE_CLIENT_ID` (optional)

Add `https://inventari-frontend.onrender.com` to Google Cloud **Authorized JavaScript origins** (no trailing slash).

## Local dev

- Vite proxies `/api` → `http://localhost:3001` (`frontend/vite.config.ts`).
- Env files: `backend/.env` (secrets), root `.env` or `frontend/.env` for `VITE_*`.

## Android APK

Root `.env.production`:

```env
VITE_API_BASE_URL=https://inventari-frontend.onrender.com/api
```

Then `npm run android:sync`. See [android-apk.md](android-apk.md).

## Blueprint

See [render.yaml](../render.yaml) at repo root (single-service layout).
