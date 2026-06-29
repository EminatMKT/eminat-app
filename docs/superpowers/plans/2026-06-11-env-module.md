# Módulo de variables de entorno — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralizar todas las variables de entorno en `lib/env.ts` y `lib/env.server.ts` con validación Zod al arrancar, y migrar los 8 archivos consumidores.

**Architecture:** Dos módulos Zod — `lib/env.ts` para vars seguras para el cliente (`NEXT_PUBLIC_*` + `NODE_ENV` + `APP_ENV`), y `lib/env.server.ts` para vars solo-servidor (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`). La separación es necesaria porque Next.js reemplaza vars sin prefijo `NEXT_PUBLIC_` con `undefined` en el bundle del cliente, lo que haría fallar el schema Zod si todo estuviera en un solo archivo importado por código cliente.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zod (nueva dep), pnpm

---

## Mapa de archivos

| Acción | Archivo |
|---|---|
| Crear | `lib/env.ts` |
| Crear | `lib/env.server.ts` |
| Crear | `.env.example` |
| Modificar | `.env.local` |
| Modificar | `lib/supabase.ts` |
| Modificar | `app/api/admin/create-user/route.ts` |
| Modificar | `app/api/admin/delete-user/route.ts` |
| Modificar | `app/api/admin/reassign-and-delete/route.ts` |
| Modificar | `app/api/admin/reset-password/route.ts` |
| Modificar | `app/api/admin/update-user/route.ts` |
| Modificar | `app/api/mail/campaigns/route.ts` |
| Modificar | `app/api/mail/send/route.ts` |

---

### Task 1: Crear rama y instalar Zod

**Files:**
- Ninguno (git + pnpm)

- [ ] **Step 1: Crear rama**

```bash
git checkout -b feature/env-module
```

- [ ] **Step 2: Instalar Zod**

```bash
pnpm add zod
```

- [ ] **Step 3: Verificar que Zod aparece en package.json**

```bash
grep '"zod"' package.json
```

Salida esperada: `"zod": "^X.Y.Z"`

---

### Task 2: Crear `lib/env.ts` (vars seguras para cliente)

**Files:**
- Create: `lib/env.ts`

- [ ] **Step 1: Crear el archivo**

Contenido completo de `lib/env.ts`:

```typescript
import { z } from 'zod'

const clientSchema = z.object({

  // ── Supabase (cliente + servidor) ─────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // ── Modo de build — gestionado por Next.js, no se toca ────────
  // development = next dev | production = next build | test = jest
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── Contexto de despliegue — se define en cada entorno ────────
  // development = local | vercel = eminat.app | selfhosted = servidor propio
  APP_ENV: z.enum(['development', 'vercel', 'selfhosted']).default('development'),

})

export const env = clientSchema.parse(process.env)
```

- [ ] **Step 2: Verificar TypeScript**

```bash
pnpm tsc --noEmit
```

Salida esperada: sin errores.

---

### Task 3: Crear `lib/env.server.ts` (vars solo-servidor)

**Files:**
- Create: `lib/env.server.ts`

- [ ] **Step 1: Crear el archivo**

Contenido completo de `lib/env.server.ts`:

```typescript
import { z } from 'zod'

const serverSchema = z.object({

  // ── Supabase service role (bypass RLS) — NUNCA al cliente ─────
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // ── Resend API key — NUNCA al cliente ─────────────────────────
  RESEND_API_KEY: z.string().startsWith('re_'),

})

export const serverEnv = serverSchema.parse(process.env)
```

- [ ] **Step 2: Verificar TypeScript**

```bash
pnpm tsc --noEmit
```

Salida esperada: sin errores.

---

### Task 4: Actualizar `.env.local` y crear `.env.example`

**Files:**
- Modify: `.env.local`
- Create: `.env.example`

- [ ] **Step 1: Corregir `.env.local`**

Reemplazar el contenido actual con (los valores de Supabase se preservan, solo se corrige la URL y se agrega APP_ENV):

```bash
# Supabase — Settings > API en tu proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ruedelunbtaomhrzgelc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZWRlbHVuYnRhb21ocnpnZWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTk0MDIsImV4cCI6MjA5MDkzNTQwMn0.Hj9pq9RRM1hCWGIvETVq6n3AyjIaVHqDBcZnWwBi4YQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZWRlbHVuYnRhb21ocnpnZWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM1OTQwMiwiZXhwIjoyMDkwOTM1NDAyfQ.Kpvu6TriJJs8H57X-BP1WnRygrG86hubdlfN6yF526c

# Resend — resend.com > API Keys
# ⚠️ Zod valida que empiece con 're_'. Si no tenés la key aún, el dev server
# arrancará pero cualquier API route que use serverEnv fallará al cargarse.
# Completar antes de probar rutas de email o admin.
RESEND_API_KEY=re_placeholder

# Contexto de despliegue
APP_ENV=development
```

> **Nota:** `RESEND_API_KEY=re_placeholder` pasa la validación Zod para que el dev server arranque. Reemplazar con la key real de resend.com cuando esté disponible. `.env.local` es gitignored — nunca se commitea.

- [ ] **Step 2: Crear `.env.example`**

Crear `/.env.example` con:

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

- [ ] **Step 3: Commit parcial**

```bash
git add lib/env.ts lib/env.server.ts .env.example
git commit -m "feat: add env modules with Zod validation"
```

---

### Task 5: Migrar `lib/supabase.ts`

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Reemplazar el contenido completo**

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = env

export const createClient = () =>
  createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

export const supabase = createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

- [ ] **Step 2: Verificar TypeScript**

```bash
pnpm tsc --noEmit
```

Salida esperada: sin errores.

---

### Task 6: Migrar `app/api/admin/delete-user/route.ts`

**Files:**
- Modify: `app/api/admin/delete-user/route.ts:1-3` (imports) y `:37-50` (handler)

- [ ] **Step 1: Agregar import después de los imports existentes (línea 3)**

Cambiar el bloque de imports de:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
```
A:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'
```

- [ ] **Step 2: Reemplazar el bloque de inicialización dentro de `POST` (líneas 37-50)**

Cambiar:
```typescript
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error(`${TAG} SUPABASE_SERVICE_ROLE_KEY is not configured`)
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in this environment.' },
      { status: 500 },
    )
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
```
Por:
```typescript
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv
  const { NEXT_PUBLIC_SUPABASE_URL } = env

  const supabaseAdmin = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
```

- [ ] **Step 3: Verificar TypeScript**

```bash
pnpm tsc --noEmit
```

Salida esperada: sin errores.

---

### Task 7: Migrar `app/api/admin/reassign-and-delete/route.ts`

**Files:**
- Modify: `app/api/admin/reassign-and-delete/route.ts`

- [ ] **Step 1: Agregar imports**

Cambiar:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
```
A:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'
```

- [ ] **Step 2: Reemplazar bloque de inicialización dentro de `POST` (líneas 31-44)**

Cambiar:
```typescript
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error(`${TAG} SUPABASE_SERVICE_ROLE_KEY is not configured`)
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in this environment.' },
      { status: 500 },
    )
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
```
Por:
```typescript
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv
  const { NEXT_PUBLIC_SUPABASE_URL } = env

  const supabaseAdmin = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
```

- [ ] **Step 3: Verificar TypeScript**

```bash
pnpm tsc --noEmit
```

---

### Task 8: Migrar `app/api/admin/reset-password/route.ts`

**Files:**
- Modify: `app/api/admin/reset-password/route.ts`

- [ ] **Step 1: Agregar imports**

Cambiar:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
```
A:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'
```

- [ ] **Step 2: Reemplazar bloque de inicialización dentro de `POST` (líneas 15-28)**

Cambiar:
```typescript
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error(`${TAG} SUPABASE_SERVICE_ROLE_KEY is not configured`)
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in this environment.' },
      { status: 500 },
    )
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
```
Por:
```typescript
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv
  const { NEXT_PUBLIC_SUPABASE_URL } = env

  const supabaseAdmin = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
```

- [ ] **Step 3: Verificar TypeScript**

```bash
pnpm tsc --noEmit
```

---

### Task 9: Migrar `app/api/admin/update-user/route.ts`

**Files:**
- Modify: `app/api/admin/update-user/route.ts`

- [ ] **Step 1: Agregar imports**

Cambiar:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
```
A:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'
```

- [ ] **Step 2: Reemplazar bloque de inicialización dentro de `POST` (líneas 29-42)**

Cambiar:
```typescript
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error(`${TAG} SUPABASE_SERVICE_ROLE_KEY is not configured`)
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in this environment.' },
      { status: 500 },
    )
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
```
Por:
```typescript
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv
  const { NEXT_PUBLIC_SUPABASE_URL } = env

  const supabaseAdmin = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
```

- [ ] **Step 3: Verificar TypeScript**

```bash
pnpm tsc --noEmit
```

---

### Task 10: Migrar `app/api/admin/create-user/route.ts`

**Files:**
- Modify: `app/api/admin/create-user/route.ts`

Este archivo tiene dos usos de env vars: Resend (en `sendWelcomeEmail`) y Supabase (en `POST`).

- [ ] **Step 1: Agregar imports**

Cambiar:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { normalizeRole, ROLE_LABELS } from '@/lib/permissions'
```
A:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { normalizeRole, ROLE_LABELS } from '@/lib/permissions'
import { env } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'
```

- [ ] **Step 2: Actualizar `sendWelcomeEmail` — reemplazar el check de Resend (líneas 110-114)**

Cambiar:
```typescript
  if (!process.env.RESEND_API_KEY) {
    return 'No se envió el correo: RESEND_API_KEY no está configurada en este environment.'
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
```
Por:
```typescript
  try {
    const { RESEND_API_KEY } = serverEnv
    const resend = new Resend(RESEND_API_KEY)
```

- [ ] **Step 3: Actualizar `POST` — reemplazar bloque de inicialización Supabase (líneas 133-146)**

Cambiar:
```typescript
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error(`${TAG} SUPABASE_SERVICE_ROLE_KEY is not configured`)
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in this environment.' },
      { status: 500 },
    )
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
```
Por:
```typescript
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv
  const { NEXT_PUBLIC_SUPABASE_URL } = env

  const supabaseAdmin = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
```

- [ ] **Step 4: Verificar TypeScript**

```bash
pnpm tsc --noEmit
```

---

### Task 11: Migrar `app/api/mail/campaigns/route.ts`

**Files:**
- Modify: `app/api/mail/campaigns/route.ts`

Este archivo inicializa el cliente Supabase a nivel de módulo (fuera de los handlers) con un fallback. El fallback se preserva.

- [ ] **Step 1: Reemplazar imports y bloque de inicialización (líneas 1-7)**

Cambiar:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```
Por:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'

const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = env
const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv

const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

- [ ] **Step 2: Verificar TypeScript**

```bash
pnpm tsc --noEmit
```

---

### Task 12: Migrar `app/api/mail/send/route.ts`

**Files:**
- Modify: `app/api/mail/send/route.ts`

- [ ] **Step 1: Agregar import y mover inicialización de Resend fuera del handler**

Cambiar:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
```
Por:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { serverEnv } from '@/lib/env.server'

const { RESEND_API_KEY } = serverEnv
const resend = new Resend(RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
```

- [ ] **Step 2: Verificar TypeScript**

```bash
pnpm tsc --noEmit
```

---

### Task 13: Commit final y verificación

**Files:**
- Todos los archivos modificados

- [ ] **Step 1: Verificar que no quedan referencias a `process.env` fuera de `lib/env.ts` y `lib/env.server.ts`**

```bash
grep -r "process\.env\." app/ lib/ --include="*.ts" --include="*.tsx" | grep -v "lib/env"
```

Salida esperada: sin output (ninguna referencia).

- [ ] **Step 2: Build de producción para verificar que no hay errores de bundling**

```bash
pnpm build
```

Salida esperada: build exitoso sin errores.

- [ ] **Step 3: Commit final**

```bash
git add lib/env.ts lib/env.server.ts .env.example \
  lib/supabase.ts \
  app/api/admin/create-user/route.ts \
  app/api/admin/delete-user/route.ts \
  app/api/admin/reassign-and-delete/route.ts \
  app/api/admin/reset-password/route.ts \
  app/api/admin/update-user/route.ts \
  app/api/mail/campaigns/route.ts \
  app/api/mail/send/route.ts \
  package.json pnpm-lock.yaml
git commit -m "feat: centralize env vars with Zod validation and migrate all consumers"
```

> **Nota:** `.env.local` NO se commitea — es gitignored y contiene credenciales reales.
