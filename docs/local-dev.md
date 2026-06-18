## Local development

### 1) Backend env

Create `backend/.env`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `PORT=3001`
- `CORS_ORIGIN=http://localhost:5173`

### 2) Install and run

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173` (or next available port)
- Backend: `http://localhost:3001/api/health`

### Phone testing (same Wi‑Fi)

Vite is configured with `host: true` so the dev server accepts connections from your LAN.

1. Run `npm run dev` on your Mac.
2. In the terminal, look for a **Network** line, e.g. `http://192.168.1.11:5173/`.
3. On your phone (same Wi‑Fi), open **`http://192.168.1.11:5173/`** (use your Mac’s IP if different). The mobile UI loads automatically; you do not need `/mobile`.

If you still see “connection refused”:

- Restart the dev server after pulling config changes (`Ctrl+C`, then `npm run dev` again).
- Confirm the phone is not on cellular data or a guest network that blocks device-to-device traffic.
- On macOS, allow incoming connections for Node if the firewall prompts you.

### 3) Supabase SQL (if needed)

If you ever need to recreate the schema:
- `docs/sql/01_tables.sql`
- `docs/sql/02_stock_trigger.sql` (recommended)

