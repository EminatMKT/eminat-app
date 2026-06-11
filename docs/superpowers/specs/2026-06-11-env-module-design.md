# Módulo de variables de entorno — Diseño

**Fecha:** 2026-06-11
**Estado:** Aprobado
**Rama:** `feature/env-module`

## Problema

Las variables de entorno se consumen con `process.env` disperso en 7 archivos. No hay validación al arrancar: si falta una variable, el error aparece en runtime, no al iniciar. No hay distinción formal entre entornos de despliegue.

## Solución

Un único módulo `lib/env.ts` que valida todas las variables con Zod al importarse y exporta un objeto tipado `env`. Todos los consumidores importan desde ahí — `process.env` queda prohibido fuera de ese módulo.

## Arquitectura

### `lib/env.ts` (nuevo)

Schema Zod dividido en cuatro secciones:

```typescript
import { z } from 'zod'

const envSchema = z.object({

  // ── Supabase (cliente) ─────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // ── Supabase + Resend (solo servidor) ─────────────────────────
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().startsWith('re_'),

  // ── Modo de build — gestionado por Next.js, no se toca ────────
  // development = next dev | production = next build | test = jest
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── Contexto de despliegue — se define en cada entorno ────────
  // development = local | vercel = eminat.app | selfhosted = servidor propio
  APP_ENV: z.enum(['development', 'vercel', 'selfhosted']).default('development'),

})

export const env = envSchema.parse(process.env)
```

Si falta o es inválida alguna variable, Zod lanza un error descriptivo antes de que la app arranque.

### Diferencia entre `NODE_ENV` y `APP_ENV`

| Variable | Quién la controla | Valores | Para qué sirve |
|---|---|---|---|
| `NODE_ENV` | Next.js (automático) | `development` / `production` / `test` | Modo de build y optimizaciones del framework |
| `APP_ENV` | El desarrollador (manual) | `development` / `vercel` / `selfhosted` | Distinguir entre los dos despliegues de producción |

Ambos entornos de producción (Vercel y servidor propio) tienen `NODE_ENV=production`. `APP_ENV` es lo que permite al código saber en cuál de los dos está corriendo.

### Patrón de consumo

Todos los archivos usan destructuring:

```typescript
import { env } from '@/lib/env'
const { SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL } = env
```

## Archivos afectados

### Nuevo
- `lib/env.ts` — módulo central
- `.env.example` — template commiteado al repo

### Modificados
- `.env.local` — corregir URL (remover `/rest/v1/`), agregar `APP_ENV=development`
- `lib/supabase.ts` — migrar a `env`
- `app/api/admin/create-user/route.ts`
- `app/api/admin/delete-user/route.ts`
- `app/api/admin/reassign-and-delete/route.ts`
- `app/api/admin/reset-password/route.ts`
- `app/api/admin/update-user/route.ts`
- `app/api/mail/campaigns/route.ts`
- `app/api/mail/send/route.ts`

## Archivos `.env` por entorno

| Entorno | Archivo / sistema |
|---|---|
| Local | `.env.local` (gitignored) |
| Vercel | Variables en Vercel Dashboard → Settings → Environment Variables |
| Servidor propio | Variables del sistema operativo o `.env.production` en el servidor (nunca commiteado) |

### `.env.example` (commiteado)

```bash
# ── Supabase (cliente) ─────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# ── Supabase + Resend (solo servidor) ─────────────────────────
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...

# ── Contexto de despliegue ─────────────────────────────────────
# development | vercel | selfhosted
APP_ENV=development
```

## Dependencias

- `zod` — agregar a `dependencies` en `package.json`

## Lo que NO cambia

- La lógica de cada módulo o API route no cambia — solo la fuente de las variables
- Los nombres de las variables de entorno no cambian
- No se agrega lógica condicional por `APP_ENV` en esta iteración — solo se expone para uso futuro
