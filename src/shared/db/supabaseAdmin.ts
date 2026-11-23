import 'server-only'
import { assertDeploymentIsolation } from '../../../deployment-isolation.cjs'
import { createClient } from '@supabase/supabase-js'
import { clientEnv } from './env.client'
import { serverEnv } from './env.server'
import { noStoreFetch } from './noStoreFetch'

// Cliente service_role para rutas admin (bypassa RLS). NUNCA en el cliente browser.
export function supabaseAdmin(options: { noStore?: boolean } = {}) {
  const approvalId = process.env.LILLY_ISOLATED_QA_APPROVAL_ID
  // Only the Supabase client's own identity and an explicit QA-approval id are
  // relevant here. Unrelated secrets (QBO, patient email, cron, DATABASE_URL,
  // RESEND_API_KEY, ...) must never make an unrelated consumer of this shared
  // factory (Admin, Billing, Directory, Tasks, ...) refuse to construct a client
  // just because some other feature has its own real credentials configured in
  // the same deployment (PR #209 review, finding #1). Meta's own flows already
  // enforce their isolation separately via metaDeployment()/resolveMetaDeployment().
  assertDeploymentIsolation({
    VERCEL_ENV: process.env.VERCEL_ENV, VERCEL_TARGET_ENV: process.env.VERCEL_TARGET_ENV,
    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID, VERCEL_ORG_ID: process.env.VERCEL_ORG_ID,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    NEXT_PUBLIC_APP_ENV: clientEnv.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SECRET_KEY: serverEnv.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    LILLY_ISOLATED_QA_APPROVAL_ID: approvalId,
    ...(approvalId ? {
      LILLY_META_APP_ID: process.env.LILLY_META_APP_ID,
      LILLY_META_APP_SECRET: process.env.LILLY_META_APP_SECRET,
      LILLY_META_GRAPH_VERSION: process.env.LILLY_META_GRAPH_VERSION,
      LILLY_SOCIAL_TOKEN_KEY: process.env.LILLY_SOCIAL_TOKEN_KEY,
    } : {}),
  })
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(options.noStore ? { global: { fetch: noStoreFetch } } : {}),
  })
}
