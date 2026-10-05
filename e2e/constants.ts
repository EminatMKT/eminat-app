import { MARKETING_COORDINATOR_EMAIL } from '@/shared/constants/contacts'

export const DEFAULT_URL ='http://127.0.0.1:54321'
export const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
// Playwright does not load dotenv: in a clean terminal the env is empty. Fallback: the local
// Supabase stack's demo key (public, the same as ci.yml and `supabase status`), the way
// `seed.ts` already resolves the service key.
const DEFAULT_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
export const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_ANON
// The users global-setup and the roles specs share. Each is written once, here.
/** Admin from global-setup: the main UI driver. The last-admin case demotes it, so it runs last. */
export const FREDDY_EMAIL = MARKETING_COORDINATOR_EMAIL
/** `sin_asignar` from global-setup; the role CRUD gives it `soporte`. */
export const NUEVO_EMAIL = 'nuevo@eminat.net'
/** Admin from global-setup that the multiple-admins case deletes. */
export const BOOTSTRAP_EMAIL = 'bootstrap@eminat.net'
/** Created through the admin API by the user-creation case; global-setup removes it. */
export const CREADO_EMAIL = 'creado@eminat.net'
/** The second admin the multiple-admins case creates and keeps. */
export const ADMIN2_EMAIL = 'admin2@eminat.net'
/** The admin tasks-multi-responsables creates for itself, and global-setup removes if a run
 *  aborted before its afterAll: a leftover admin would make the roles last-admin case skip. */
export const MULTI_ADMIN_EMAIL = 'multi.admin.e2e@eminat.net'
