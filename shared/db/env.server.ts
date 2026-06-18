import { z } from 'zod'

const serverSchema = z.object({

  // ── Supabase service role (bypass RLS) — NUNCA al cliente ─────
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // ── Resend API key — NUNCA al cliente ─────────────────────────
  RESEND_API_KEY: z.string().startsWith('re_'),

})

export const serverEnv = serverSchema.parse(process.env)
