import { z } from 'zod'

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