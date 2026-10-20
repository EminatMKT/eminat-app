import { createClient } from '@supabase/supabase-js'
import { clientEnv } from './env.client'
import { serverEnv } from './env.server'
import { noStoreFetch } from './noStoreFetch'

// Cliente service_role para rutas admin (bypassa RLS). NUNCA en el cliente browser.
export function supabaseAdmin(options: { noStore?: boolean } = {}) {
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(options.noStore ? { global: { fetch: noStoreFetch } } : {}),
  })
}
