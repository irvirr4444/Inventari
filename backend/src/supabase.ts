import { createClient } from '@supabase/supabase-js'

export function createSupabaseAdmin(opts: {
  supabaseUrl: string
  serviceKey: string
}) {
  return createClient(opts.supabaseUrl, opts.serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

