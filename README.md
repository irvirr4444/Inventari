## Inventari

Local dev:

```bash
npm install
npm run dev
```

### Environment
- Copy `backend/.env.example` to `backend/.env` and fill in:
  - `SUPABASE_URL` (from Supabase project settings)
  - `SUPABASE_SERVICE_KEY` (server-only; keep secret)

Frontend calls the backend; no Supabase keys are used in the browser in v1.
