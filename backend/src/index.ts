import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { buildApp } from './server.js'

// Prefer backend/.env, but also support repo-root .env for convenience.
dotenv.config()
dotenv.config({ path: path.resolve(process.cwd(), '../.env'), override: false })

function loadEnvLoose(envPath: string) {
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed)
    if (!m) continue
    const key = m[1]
    let value = m[2]
    // strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

// Fallback for env files that contain `KEY = value` spacing.
loadEnvLoose(path.resolve(process.cwd(), '.env'))
loadEnvLoose(path.resolve(process.cwd(), '../.env'))

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'

const app = await buildApp()

await app.listen({ port, host })

