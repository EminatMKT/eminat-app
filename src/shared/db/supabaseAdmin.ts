import 'server-only'
import { assertDeploymentIsolation } from '../../../deployment-isolation.cjs'
import { createClient } from '@supabase/supabase-js'
import { clientEnv } from './env.client'
import { serverEnv } from './env.server'
import { noStoreFetch } from './noStoreFetch'

// Cliente service_role para rutas admin (bypassa RLS). NUNCA en el cliente browser.
export function supabaseAdmin(options: { noStore?: boolean } = {}) {
  assertDeploymentIsolation({ ...process.env,
    NEXT_PUBLIC_APP_ENV: clientEnv.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: serverEnv.SUPABASE_SECRET_KEY })
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(options.noStore ? { global: { fetch: noStoreFetch } } : {}),
  })
}
