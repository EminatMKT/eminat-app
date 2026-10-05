import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { clientEnv } from '@/shared/db/env.client'

export default function ssrClient() {
  const cookieStore = cookies()
  const readCookie = (name: string) => cookieStore.get(name)?.value
  const options = { cookies: { get: readCookie } }
  const client = createServerClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options)
  return client
}

// Reads the caller's session from the SSR cookies. With the publishable (anon) key, not with
// service_role: the point is that the query runs AS the user, so RLS and auth.uid() see them.
// Server-only (`next/headers`), so `@/shared/db` does not re-export it.
