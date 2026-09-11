import { MODULE, modulePath } from '@/shared/auth/permissions'

const DEFAULT_URL = 'http://127.0.0.1:54321'
export const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
// Playwright no carga dotenv: en una terminal limpia el env queda vacío. Fallback: la llave
// demo del stack local de Supabase (pública, la misma de ci.yml y de `supabase status`),
// igual que ya resuelve `seed.ts` para la service key.
const DEFAULT_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
export const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_ANON

/** Adónde navega el login. Absoluta a propósito: `waitForURL` contra el `baseURL` relativo
 *  no espera lo mismo, y por eso repite el literal de playwright.config.ts. */
export const HOME_URL = 'http://localhost:3000/'

/** La pantalla de login y los dos campos por los que un spec la completa. */
export const LOGIN_PATH = '/login'
export const EMAIL_PLACEHOLDER = 'tu@eminat.net'
export const PASSWORD_INPUT = 'input[type="password"]'

/** Lo que un spec busca en pantalla para saber dónde quedó parado. */
export const HOME_LINK = 'Home'
export const ROLES_TAB = 'Roles'
export const DENIED = 'Acceso denegado'

/** Los tres que Playwright pide por nombre: el landmark, la tecla y el rol ARIA. */
export const MAIN = 'main'
export const ENTER = 'Enter'
export const BUTTON = 'button'

/** Los módulos por los que un spec de gating pregunta: su ícono en el rail, y su ruta. */
export const RAIL_ADMIN = `[data-tour="${MODULE.ADMIN}"]`
export const RAIL_DIRECTORIO = `[data-tour="${MODULE.DIRECTORIO}"]`
export const DIRECTORIO_PATH = modulePath(MODULE.DIRECTORIO)
export const STRATIX_PATH = modulePath(MODULE.STRATIX_MKT)
