import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // Next.js fija jsx:"preserve" en tsconfig → forzamos runtime automático para importar .tsx.
  oxc: { jsx: { runtime: 'automatic' } },
  // tsconfig usa "@/*": ["./*"]; replicamos el alias para Vitest.
  resolve: { alias: { '@': root } },
  // env.client.ts valida con zod al importar; dummies para que los módulos carguen (igual que CI).
  test: {
    // e2e/ son specs de Playwright (otro runner) — vitest no debe tocarlos.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'dummy-anon-key',
    },
  },
})
