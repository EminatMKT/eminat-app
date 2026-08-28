import { z } from 'zod'

const serverSchema = z.object({

  // ── Supabase service role (bypass RLS) — NUNCA al cliente ─────
  SUPABASE_SECRET_KEY: z.string().min(1),

  // ── Resend API key — NUNCA al cliente ─────────────────────────
  // OPCIONAL a propósito. Este parse corre al importar, y `supabaseAdmin.ts`
  // importa `serverEnv`, así que lo usan TODAS las rutas de admin. Si la key
  // fuera obligatoria, no tenerla no degradaría el correo: tiraría con ZodError
  // el alta, el borrado, la edición, los roles y la organización — una
  // credencial de mail volteando la administración de usuarios.
  // Sin ella el envío se saltea y devuelve su warning; ver `sendWelcomeEmail`.
  RESEND_API_KEY: z.string().startsWith('re_').optional(),

})

export const serverEnv = serverSchema.parse(process.env)
