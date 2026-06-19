#!/usr/bin/env tsx
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSupabaseAdmin } from '../src/supabase.js'
import { ensureLegacyUserSeeded } from '../src/services/authService.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
dotenv.config({ path: path.join(repoRoot, 'backend/.env') })
dotenv.config({ path: path.join(repoRoot, '.env') })

const email = (process.env.login_email ?? process.env.LOGIN_EMAIL)?.trim().toLowerCase()
const password = (process.env.login_password ?? process.env.LOGIN_PASSWORD)?.trim()
const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

if (!email || !password || !supabaseUrl || !serviceKey) {
  console.error('Missing LOGIN_EMAIL, LOGIN_PASSWORD, SUPABASE_URL, or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createSupabaseAdmin({ supabaseUrl, serviceKey })

await ensureLegacyUserSeeded(supabase, email, password)
console.log(`Legacy user seeded/updated for ${email}`)
