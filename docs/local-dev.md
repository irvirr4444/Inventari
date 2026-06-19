## Local development

### 1) Environment

Create `backend/.env` (or use repo root `.env` — `backend/src/index.ts` loads both):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `login_email` / `login_password` — legacy admin (after `npm run seed:legacy-user -w backend`)
- `SESSION_SECRET` — recommended (min 32 chars)
- `PORT=3001`
- `CORS_ORIGIN=http://localhost:5173`

Optional Google sign-in:

- `GOOGLE_CLIENT_ID` — same Web client ID as below

Frontend / Vite (repo root `.env` or `frontend/.env`; Vite reads the repo root via `envDir`):

```env
VITE_API_BASE_URL=/api
VITE_GOOGLE_CLIENT_ID=   # must match GOOGLE_CLIENT_ID
```

Google Cloud Console → **Authorized JavaScript origins:** `http://localhost:5173` (not LAN IPs). Redirect URIs are usually unnecessary for this app’s ID-token flow.

### 2) Install and run

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173` (or next available port)
- Backend: `http://localhost:3001/api/health`
- Login: `http://localhost:5173/login` — **Hyr** / **Regjistrohu** on one card; `/signup` redirects to sign-up mode

### Phone testing (same Wi‑Fi)

Vite is configured with `host: true` so the dev server accepts connections from your LAN.

1. Run `npm run dev` on your Mac.
2. In the terminal, look for a **Network** line, e.g. `http://192.168.1.11:5173/`.
3. On your phone (same Wi‑Fi), open **`http://192.168.1.11:5173/`** (use your Mac’s IP if different). The mobile UI loads automatically; you do not need `/mobile`.

**Google sign-in on a phone over LAN:** Google OAuth does not accept `http://192.168.x.x` origins. Use desktop `localhost` for Google testing, or a public tunnel (ngrok, Cloudflare Tunnel) and add that HTTPS URL in Google Cloud Console. Email/password login works over LAN without extra setup.

If you still see “connection refused”:

- Restart the dev server after pulling config changes (`Ctrl+C`, then `npm run dev` again).
- Confirm the phone is not on cellular data or a guest network that blocks device-to-device traffic.
- On macOS, allow incoming connections for Node if the firewall prompts you.

### 3) Supabase SQL (if needed)

For multi-tenant auth, run `docs/sql/07_perdorues_lokacioni.sql` then `docs/sql/APPLY_08_through_11.sql`, then once:

```bash
npm run seed:legacy-user -w backend
```

Other schema files (fresh projects):

- `docs/sql/01_tables.sql` … `06_veprim_batch_ora_pershkrimi.sql`
- `docs/sql/02_stock_trigger.sql` (recommended for OUT validation)
