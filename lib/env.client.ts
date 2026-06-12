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

  // ── Contexto de despliegue — se define en cada entorno ────────
  // development = local | vercel = eminat.app | selfhosted = servidor propio
  APP_ENV: z.enum(['development', 'vercel', 'selfhosted']).default('development'),

}).superRefine((env, ctx) => {
  // Salvaguarda: en desarrollo la URL NUNCA puede ser la base de producción.
  // Si esto falla, .env.local quedó apuntando a prod — corregir antes de seguir.
  if (env.APP_ENV === 'development' && env.NEXT_PUBLIC_SUPABASE_URL.includes(PROD_DB_REF)) {
    ctx.addIssue({
      code: 'custom',
      path: ['NEXT_PUBLIC_SUPABASE_URL'],
      message: `APP_ENV=development pero la URL apunta a la base de PRODUCCIÓN (${PROD_DB_REF}). ` +
        `Usá las credenciales del proyecto Supabase de desarrollo en .env.local.`,
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
  APP_ENV: process.env.APP_ENV,
})

// ── Helpers derivados ─────────────────────────────────────────────
// `isProdDb` = la app está conectada a la base de producción (Vercel / selfhosted).
// `isDevDb`  = entorno de desarrollo local contra el proyecto Supabase dev.
export const isProdDb = clientEnv.APP_ENV !== 'development'
export const isDevDb = !isProdDb
