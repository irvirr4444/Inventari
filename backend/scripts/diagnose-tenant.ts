#!/usr/bin/env tsx
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSupabaseAdmin } from '../src/supabase.js'
import { LEGACY_USER_ID } from '../src/domain/user.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
dotenv.config({ path: path.join(repoRoot, 'backend/.env') })
dotenv.config({ path: path.join(repoRoot, '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
const loginEmail = (process.env.login_email ?? process.env.LOGIN_EMAIL)?.trim().toLowerCase()

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createSupabaseAdmin({ supabaseUrl, serviceKey })

async function main() {
  console.log('=== Tenant / schema diagnostics ===\n')
  console.log('LEGACY_USER_ID:', LEGACY_USER_ID)
  console.log('LOGIN_EMAIL:', loginEmail ?? '(not set)')

  const { data: users, error: usersErr } = await supabase.from('perdorues').select('id,email,ui_lloji,is_legacy')
  if (usersErr) {
    console.error('perdorues query failed:', usersErr.message)
  } else {
    console.log('\nperdorues rows:', users?.length ?? 0)
    for (const u of users ?? []) {
      console.log(`  - ${u.email} id=${u.id} ui=${u.ui_lloji} legacy=${u.is_legacy}`)
    }
  }

  const { count: totalProducts, error: totalErr } = await supabase
    .from('produkti')
    .select('*', { count: 'exact', head: true })
  console.log('\nprodukti total:', totalErr ? totalErr.message : totalProducts)

  const { count: legacyProducts, error: legacyErr } = await supabase
    .from('produkti')
    .select('*', { count: 'exact', head: true })
    .eq('pronari_id', LEGACY_USER_ID)
  console.log('produkti for legacy user:', legacyErr ? legacyErr.message : legacyProducts)

  const { data: productOwners, error: ownersErr } = await supabase.from('produkti').select('pronari_id')
  if (ownersErr) {
    console.log('produkti pronari_id sample failed:', ownersErr.message)
  } else {
    const counts = new Map<string, number>()
    for (const row of productOwners ?? []) {
      const key = row.pronari_id ?? 'NULL'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    console.log('produkti pronari_id distribution:', Object.fromEntries(counts))
  }

  if (loginEmail) {
    const loginUser = users?.find((u) => u.email === loginEmail)
    if (loginUser) {
      const { count, error } = await supabase
        .from('produkti')
        .select('*', { count: 'exact', head: true })
        .eq('pronari_id', loginUser.id)
      console.log(`produkti for login user (${loginEmail}):`, error ? error.message : count)
      console.log('login user id matches legacy:', loginUser.id === LEGACY_USER_ID)
    } else {
      console.log(`login email ${loginEmail} not found in perdorues`)
    }
  }

  const { error: lokacioniColErr } = await supabase
    .from('veprimi')
    .select('lokacioni_id')
    .limit(1)
  console.log('\nveprimi.lokacioni_id column:', lokacioniColErr ? `MISSING — ${lokacioniColErr.message}` : 'OK')

  const { count: lokacioniCount, error: lokErr } = await supabase
    .from('lokacioni')
    .select('*', { count: 'exact', head: true })
  console.log('lokacioni rows:', lokErr ? lokErr.message : lokacioniCount)

  const { data: tenantConfigSample, error: tenantConfigErr } = await supabase
    .from('tenant_config')
    .select('pronari_id, track_price, onboarding_complete, tutorial_seen')
    .limit(1)
  console.log(
    'tenant_config table:',
    tenantConfigErr ? `MISSING or incomplete — ${tenantConfigErr.message}` : 'OK',
  )
  if (!tenantConfigErr && tenantConfigSample?.[0]) {
    const row = tenantConfigSample[0] as Record<string, unknown>
    console.log('  sample row keys:', Object.keys(row).join(', '))
  }

  const missingPronari = ownersErr?.message?.includes('pronari_id')
  const missingLokacioniCol = lokacioniColErr?.message?.includes('lokacioni_id')
  const missingTenantConfig = tenantConfigErr != null
  const needsV2Migration =
    tenantConfigErr?.message?.includes('tutorial_seen') ||
    tenantConfigErr?.message?.includes('onboarding_complete')

  if (missingPronari || missingLokacioniCol || lokacioniCount === 0) {
    console.log('\n--- FIX ---')
    console.log('Migrations 08–11 are incomplete. Run docs/sql/APPLY_08_through_11.sql')
    console.log('in Supabase SQL Editor, or set DATABASE_URL and run:')
    console.log('  npm run apply:tenant-migrations -w backend')
  } else if (missingTenantConfig && !needsV2Migration) {
    console.log('\n--- FIX ---')
    console.log('Run docs/sql/14_tenant_config.sql in Supabase SQL Editor.')
  } else if (needsV2Migration) {
    console.log('\n--- FIX ---')
    console.log('Run docs/sql/15_tenant_config_v2.sql in Supabase SQL Editor (after 14).')
  } else {
    console.log('\nSchema looks OK.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
