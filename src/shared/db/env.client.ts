import { z } from 'zod'

// Ref del proyecto Supabase de PRODUCCIÓN (eminat.app). Se usa como red de
// seguridad para evitar que el entorno de desarrollo apunte por error a la
// base de prod. El ref no es secreto: ya viaja en NEXT_PUBLIC_SUPABASE_URL.
const PROD_DB_REF = 'ruedelunbtaomhrzgelc'

const clientSchema = z.object({

  // ── Supabase (cliente + servidor) ─────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // ── Modo de build — gestionado por Next.js, no se toca ────────
  // development = next dev | production = next build | test = jest
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── Tier del entorno (1 base por tier). local = tu máquina, Supabase local
  //    (supabase start) | development = Vercel Preview (rama development), Supabase
  //    dev remoto | production = Vercel main, Supabase prod.
  //    NEXT_PUBLIC_ porque esta validación corre en el cliente (isProdDb/badge):
  //    sin el prefijo, Next no lo inyecta al bundle y en el browser sería undefined.
  NEXT_PUBLIC_APP_ENV: z.enum(['local', 'development', 'production']).default('local'),

}).superRefine((env, ctx) => {
  // Salvaguarda: solo production puede apuntar a la base de PRODUCCIÓN. Si un tier
  // local/development la tiene, es un error de configuración — corregir antes de seguir.
  if (env.NEXT_PUBLIC_APP_ENV !== 'production' && env.NEXT_PUBLIC_SUPABASE_URL.includes(PROD_DB_REF)) {
    ctx.addIssue({
      code: 'custom',
      path: ['NEXT_PUBLIC_SUPABASE_URL'],
      message: `NEXT_PUBLIC_APP_ENV=${env.NEXT_PUBLIC_APP_ENV} pero la URL apunta a la base de PRODUCCIÓN (${PROD_DB_REF}). ` +
        `Solo production debe usar esa base.`,
    })
  }
})


// ⚠️ Next.js solo inyecta en el bundle del cliente los accesos ESTÁTICOS y exactos
// a `process.env.NEXT_PUBLIC_*`. Pasar `process.env` entero deja esas claves como
// undefined en el browser y zod tira ZodError al hidratar. Hay que listarlas explícitas.
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
})

// ── Helpers derivados ─────────────────────────────────────────────
// `isProdDb` = la app está conectada a la base de producción. Solo el tier
// production usa la base de prod (lo garantiza el superRefine), así que local y
// development muestran el badge "DEV".
export const isProdDb = clientEnv.NEXT_PUBLIC_APP_ENV === 'production'
export const isDevDb = !isProdDb
