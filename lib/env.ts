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

export const env = clientSchema.parse(process.env)
