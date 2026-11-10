import type { Access } from '@/shared/db/types'

/** Auth user id behind the mocked session in the availability API tests. */
export const AUTH_USER_ID = 'auth-1'

/** The `usuarios.id` that the mocked session resolves to. */
export const VIEWER_ID = 'viewer-1'

/** Origin every fake request and fake Supabase client in these tests points at. */
export const TEST_ORIGIN = 'http://localhost'

/** Address the route-level tests send their requests to. */
export const ROUTE_URL = `${TEST_ORIGIN}/api/tasks/availability`

/** Key of the throwaway Supabase client the repository tests build. */
export const ANON_KEY = 'anon-key'

/** Status the mocked module guard answers with when it denies access. */
export const DENIED_STATUS = 403

/** Error text the mocked module guard answers with when it denies access. */
export const DENIED_ERROR = 'Forbidden'

/** What the mocked module guard answers when it grants access. */
export const GRANTED_ACCESS: Access = { ok: true, userId: AUTH_USER_ID }

/** What the mocked module guard answers when it denies access. */
export const DENIED_ACCESS: Access = { ok: false, status: DENIED_STATUS, error: DENIED_ERROR }

/** Response header the read tests inspect for the cache policy. */
export const CACHE_CONTROL_HEADER = 'cache-control'

/** Cache policy every availability read must carry. */
export const NO_STORE = 'no-store'
