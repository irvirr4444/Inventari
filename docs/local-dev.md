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
- Login: `http://localhost:5173/login`

### 3) Log in

| Account | Tab | Emri field | Password |
| --- | --- | --- | --- |
| Legacy admin | **Hyr** | `login_email` from `.env` or `Legacy User` | `login_password` from `.env` |
| New dynamic user | **Regjistrohu** | A unique name (not an email) | Min 8 characters |

After a new sign-up, you must add at least one location on `/onboarding/locations` and click **Vazhdo** before the dashboard loads.

**Common mistake:** using **Regjistrohu** with your email creates a new account and traps you on onboarding. Use **Hyr** for the legacy admin.

**Stuck on onboarding?** Click **Kthehu te hyrja** on the onboarding screen, then use **Hyr** with your legacy email or `Legacy User`.

### Phone testing (same Wi‑Fi)

Vite is configured with `host: true` so the dev server accepts connections from your LAN.

1. Run `npm run dev` on your Mac.
2. In the terminal, look for a **Network** line, e.g. `http://192.168.1.11:5173/`.
3. On your phone (same Wi‑Fi), open **`http://192.168.1.11:5173/`** (use your Mac’s IP if different). The mobile UI loads automatically; you do not need `/mobile`.

**Google sign-in on a phone over LAN:** Google OAuth does not accept `http://192.168.x.x` origins. Use desktop `localhost` for Google testing, or a public tunnel (ngrok, Cloudflare Tunnel) and add that HTTPS URL in Google Cloud Console. Emri/password login works over LAN without extra setup.

If you still see “connection refused”:

- Restart the dev server after pulling config changes (`Ctrl+C`, then `npm run dev` again).
- Confirm the phone is not on cellular data or a guest network that blocks device-to-device traffic.
- On macOS, allow incoming connections for Node if the firewall prompts you.

### 4) Supabase SQL (if needed)

For multi-tenant auth, run in the Supabase SQL Editor:

1. `docs/sql/07_perdorues_lokacioni.sql`
2. `docs/sql/APPLY_08_through_11.sql`
3. `docs/sql/13_perdorues_emri_unique.sql` — required for Emri-based sign-up (nullable email, unique names)

Then once:

```bash
npm run seed:legacy-user -w backend
```

Other schema files (fresh projects):

- `docs/sql/01_tables.sql` … `06_veprim_batch_ora_pershkrimi.sql`
- `docs/sql/02_stock_trigger.sql` (recommended for OUT validation)

### 5) Troubleshooting

| Problem | Fix |
| --- | --- |
| `EADDRINUSE` on port 3001 | Stop the old backend (`Ctrl+C`), then `npm run dev` again |
| Stuck on “Si quhen lokacionet e tua?” | Wrong account — click **Kthehu te hyrja**, then use **Hyr** with legacy email |
| Sign-up fails: `null value in column "email"` | Run `docs/sql/13_perdorues_emri_unique.sql` |
| Sign-up with email rejected | Expected — use **Hyr** for email login, not **Regjistrohu** |
| Backend health check | Open `http://localhost:3001/api/health` |
