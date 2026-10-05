export { supabaseAdmin } from '@/shared/db/supabaseAdmin'
export { syncUsuarioCargos, cargoNames } from '@/shared/db/usuarioCargos'
export { serverEnv } from '@/shared/db/env.server'
export { clientEnv } from '@/shared/db/env.client'

// The data layer's server-only door for code under `src/server/`: the service_role client, the
// cargo helpers and the env. Kept out of `@/shared/db`, which must stay safe for the browser.
