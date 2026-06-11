export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { createClient } = await import('@supabase/supabase-js')
    const { env } = await import('@/lib/env.client')
    const { serverEnv } = await import('@/lib/env.server')

    const { NEXT_PUBLIC_SUPABASE_URL } = env
    const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv

    try {
      const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { count, error } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })

      if (error) throw error

      console.log(`\x1b[32m✓ Supabase OK\x1b[0m — ${count} usuarios en DB (${NEXT_PUBLIC_SUPABASE_URL})`)
    } catch (err: any) {
      console.error(`\x1b[31m✗ Supabase FAILED\x1b[0m — ${err?.message ?? err}`)
    }
  }
}
