import { createClient } from '@supabase/supabase-js'
import { clientEnv } from './env.client'
import { serverEnv } from './env.server'

// Cliente service_role para rutas admin (bypassa RLS). NUNCA en el cliente browser.
export function supabaseAdmin() {
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
