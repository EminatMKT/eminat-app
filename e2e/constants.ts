const DEFAULT_URL = 'http://127.0.0.1:54321'
export const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
// Playwright no carga dotenv: en una terminal limpia el env queda vacío. Fallback: la llave
// demo del stack local de Supabase (pública, la misma de ci.yml y de `supabase status`),
// igual que ya resuelve `seed.ts` para la service key.
const DEFAULT_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
export const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_ANON
