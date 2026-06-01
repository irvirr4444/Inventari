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

### 3) Supabase SQL (if needed)

If you ever need to recreate the schema:
- `docs/sql/01_tables.sql`
- `docs/sql/02_stock_trigger.sql` (recommended)

