#!/usr/bin/env tsx
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
dotenv.config({ path: path.join(repoRoot, 'backend/.env') })
dotenv.config({ path: path.join(repoRoot, '.env') })

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  console.error(
    'Missing DATABASE_URL.\n' +
      'Add the Postgres connection string from Supabase Dashboard > Project Settings > Database,\n' +
      'then run: npm run apply:tenant-migrations -w backend\n\n' +
      'Or paste docs/sql/APPLY_08_through_11.sql into the Supabase SQL Editor and run it there.',
  )
  process.exit(1)
}

const sqlPath = path.join(repoRoot, 'docs/sql/APPLY_08_through_11.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  console.log('Applying tenant migrations 08–11…')
  await client.query(sql)
  console.log('Done. Run: npm run diagnose:tenant -w backend')
} catch (err) {
  console.error('Migration failed:', err instanceof Error ? err.message : err)
  process.exit(1)
} finally {
  await client.end()
}
