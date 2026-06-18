export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { createClient } = await import('@supabase/supabase-js')
    const { clientEnv } = await import('@/shared/db/env.client')
    const { serverEnv } = await import('@/shared/db/env.server')

    const { NEXT_PUBLIC_SUPABASE_URL } = clientEnv
    const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv

    try {
      const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })

      if (error) throw error

      console.log(`\x1b[32m✓ Supabase OK\x1b[0m — auth service responde (${NEXT_PUBLIC_SUPABASE_URL})`)
    } catch (err: any) {
      console.error(`\x1b[31m✗ Supabase FAILED\x1b[0m — ${err?.message ?? err}`)
    }
  }
}
