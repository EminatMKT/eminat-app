# Refactor by-feature — Fase 0 + Fase 1 (piloto `research`) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Montar el gate de calidad y la estructura `features/`+`shared/`, migrar todo lo transversal de `lib/`→`shared/` sin cambiar comportamiento, y migrar la primera feature (`research`) como piloto del patrón.

**Architecture:** `app/` queda solo para ruteo; lo transversal vive en `shared/` (retirando `lib/`); cada feature se encapsula en `features/<x>/` con API pública `index.ts`. La migración es mecánica (mover + re-apuntar imports vía alias `@/`), protegida por un gate (CI + pre-push) montado primero.

**Tech Stack:** Next.js 14.2.3 (App Router) · TypeScript 5 · Tailwind · Vitest 4 · pnpm · Supabase (`@supabase/ssr` + `@supabase/supabase-js`) · nextjs-praxis-guard.

## Global Constraints

- Gestor de paquetes: **pnpm** únicamente (nunca npm/yarn).
- Alias TS: `"@/*": ["./*"]` (ya configurado) — todo import transversal usa `@/shared/...`.
- praxis-guard: `commit.block: true`, `minSeverity: warn`, `file-responsibility.maxLines: 50`.
- Comportamiento de la app **no cambia** en Fase 0/1 (refactor estructural).
- Cada feature de Fase 2+ = un PR; no se incluye acá.
- Convención access-aware: cada `features/<x>/index.ts` exporta `export const access = {...} as const`.
- Ningún cierre de tarea sin gate en verde: `pnpm exec tsc --noEmit` + `pnpm test` + `pnpm build`.

---

## Estructura de archivos (decisiones de decomposición)

```
.github/workflows/ci.yml          ← CI gate (tsc + test + build)
.githooks/pre-push                ← hook local rápido (tsc + test)
features/research/                ← feature piloto
  components/ResearchModule.tsx    (movido desde app/components/)
  index.ts                         (API pública + access stub)
  index.test.ts                    (smoke test)
shared/
  components/{AppShell,NavBar,Onboarding}.tsx
  context/AppContext.tsx
  auth/permissions.ts
  db/{supabase,env.client,env.server}.ts  session/{index.ts,index.test.ts}
  motion/index.tsx                 (desde lib/motion.tsx)
  constants/companies.ts
  README.md                        (convención)
.praxis-guard/
  config.json                      (actualizado a featuresDir: features)
  rules/import-boundaries.mjs       (regla custom)
```

---

### Task 1: Script typecheck + hook pre-push local

**Files:**
- Modify: `package.json` (scripts)
- Create: `.githooks/pre-push`

**Interfaces:**
- Produces: script `pnpm typecheck` → `tsc --noEmit`; hook que corre `typecheck` + `test` antes de push.

- [ ] **Step 1: Agregar script `typecheck` a `package.json`**

En `"scripts"` agregar la línea (después de `"test:watch"`):
```json
    "typecheck": "tsc --noEmit"
```

- [ ] **Step 2: Crear el hook `.githooks/pre-push`**

```sh
#!/usr/bin/env sh
# Gate local rápido antes de push (bypasseable con --no-verify; el gate duro es CI).
echo "▶ pre-push: typecheck + tests"
pnpm exec tsc --noEmit || { echo "✖ typecheck falló"; exit 1; }
pnpm test || { echo "✖ tests fallaron"; exit 1; }
echo "✓ pre-push OK"
```

- [ ] **Step 3: Hacer ejecutable y registrar el hooksPath**

Run:
```bash
chmod +x .githooks/pre-push
git config core.hooksPath .githooks
```

- [ ] **Step 4: Verificar typecheck actual en verde**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores (exit 0). Si hay errores preexistentes, anotarlos — no son del refactor.

- [ ] **Step 5: Commit**

```bash
git add package.json .githooks/pre-push
git commit -m "chore: gate local pre-push (typecheck + tests) y script typecheck"
```

---

### Task 2: CI gate (GitHub Action como required check)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: workflow que en cada PR corre `tsc --noEmit`, `vitest run`, `next build`.

- [ ] **Step 1: Crear `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main, development]
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec tsc --noEmit
      - run: pnpm test
      - run: pnpm build
        env:
          # build de Next necesita las envs públicas; usar dummies para el typecheck/build de CI
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: dummy-anon-key
          APP_ENV: development
```

> Nota: si `next build` requiere más envs, agregarlas acá como dummies. praxis-audit en CI
> queda pendiente (ver spec: usar el github-action del plugin o vendorizar). Por ahora el gate
> es tsc+test+build.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: gate de PR con typecheck + tests + build"
```

- [ ] **Step 3 (manual, fuera de código):** En GitHub → Settings → Branches → branch protection de `main`/`development`: marcar el job `checks` como **required**. Documentar que sin esto el gate no es duro.

---

### Task 3: Scaffold `features/` + `shared/` con README de convención

**Files:**
- Create: `shared/README.md`, `features/README.md`

**Interfaces:**
- Produces: las carpetas raíz y la convención escrita.

- [ ] **Step 1: Crear `shared/README.md`**

```markdown
# shared/

Código transversal: lo usa **más de una** feature (o la app entera).
Subcarpetas: `components/` `context/` `auth/` `db/` `motion/` `constants/`.
Regla: si lo usa 1 sola feature → va en `features/esa/`, no acá.
```

- [ ] **Step 2: Crear `features/README.md`**

```markdown
# features/

Un módulo de negocio por carpeta. Cada feature:
- `components/` (UI endémica) · `hooks/` (lógica/estado) · `types.ts` (opcional)
- `index.ts` = API pública: ÚNICO punto importable desde afuera (`@/features/<x>`).
- `export const access = {...} as const` (convención access-aware; la consume el plan de control de acceso).
Nunca importar `@/features/otra/components/...` — solo su `index.ts`.
```

- [ ] **Step 3: Commit**

```bash
git add shared/README.md features/README.md
git commit -m "feat: scaffold features/ y shared/ con convención"
```

---

### Task 4: Migrar `companies.ts` → `shared/constants/`

**Files:**
- Move: `lib/companies.ts` → `shared/constants/companies.ts`
- Modify: importadores de `@/lib/companies`

**Interfaces:**
- Produces: módulo accesible en `@/shared/constants/companies` (mismos exports).

- [ ] **Step 1: Mover el archivo**

Run: `git mv lib/companies.ts shared/constants/companies.ts`

- [ ] **Step 2: Re-apuntar imports**

Run:
```bash
git grep -l "@/lib/companies" -- '*.ts' '*.tsx' | xargs sed -i 's#@/lib/companies#@/shared/constants/companies#g'
```

- [ ] **Step 3: Verificar gate**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: exit 0 (sin errores de import).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: mover companies.ts a shared/constants"
```

---

### Task 5: Migrar `motion.tsx` → `shared/motion/index.tsx`

**Files:**
- Move: `lib/motion.tsx` → `shared/motion/index.tsx`
- Modify: importadores de `@/lib/motion`

**Interfaces:**
- Produces: `@/shared/motion` (mismos componentes de animación).

- [ ] **Step 1: Mover**

Run: `git mv lib/motion.tsx shared/motion/index.tsx`

- [ ] **Step 2: Re-apuntar imports**

Run:
```bash
git grep -l "@/lib/motion" -- '*.ts' '*.tsx' | xargs sed -i 's#@/lib/motion#@/shared/motion#g'
```

- [ ] **Step 3: Verificar gate**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: mover motion a shared/motion"
```

---

### Task 6: Migrar `supabase`, `env.*`, `session/` → `shared/db/`

**Files:**
- Move: `lib/supabase.ts`→`shared/db/supabase.ts`, `lib/env.client.ts`→`shared/db/env.client.ts`, `lib/env.server.ts`→`shared/db/env.server.ts`, `lib/session/`→`shared/db/session/`
- Modify: importadores de `@/lib/supabase`, `@/lib/env.client`, `@/lib/env.server`, `@/lib/session`

**Interfaces:**
- Produces: `@/shared/db/{supabase,env.client,env.server}` y `@/shared/db/session`.

- [ ] **Step 1: Mover archivos**

Run:
```bash
git mv lib/supabase.ts shared/db/supabase.ts
git mv lib/env.client.ts shared/db/env.client.ts
git mv lib/env.server.ts shared/db/env.server.ts
git mv lib/session shared/db/session
```

- [ ] **Step 2: Re-apuntar imports**

Run:
```bash
git grep -l -e "@/lib/supabase" -e "@/lib/env" -e "@/lib/session" -- '*.ts' '*.tsx' \
  | xargs sed -i -e 's#@/lib/supabase#@/shared/db/supabase#g' \
                 -e 's#@/lib/env\.client#@/shared/db/env.client#g' \
                 -e 's#@/lib/env\.server#@/shared/db/env.server#g' \
                 -e 's#@/lib/session#@/shared/db/session#g'
```

- [ ] **Step 3: Verificar gate (incluye el test de session que se movió)**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: exit 0; `shared/db/session/index.test.ts` corre y pasa (sus imports relativos `./index` siguen válidos).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: mover supabase/env/session a shared/db"
```

---

### Task 7: Migrar `permissions.ts` → `shared/auth/`

**Files:**
- Move: `lib/permissions.ts` → `shared/auth/permissions.ts`
- Modify: importadores de `@/lib/permissions` (incluye `middleware.ts`)

**Interfaces:**
- Produces: `@/shared/auth/permissions` (export `canAccess`, etc., sin cambios).

- [ ] **Step 1: Mover**

Run: `git mv lib/permissions.ts shared/auth/permissions.ts`

- [ ] **Step 2: Re-apuntar imports**

Run:
```bash
git grep -l "@/lib/permissions" -- '*.ts' '*.tsx' | xargs sed -i 's#@/lib/permissions#@/shared/auth/permissions#g'
```

- [ ] **Step 3: Verificar gate**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: exit 0. Confirmar que `middleware.ts` compila (consume permissions en el Edge).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: mover permissions a shared/auth"
```

---

### Task 8: Migrar `AppContext.tsx` → `shared/context/`

**Files:**
- Move: `lib/AppContext.tsx` → `shared/context/AppContext.tsx`
- Modify: importadores de `@/lib/AppContext` (incluye `app/(app)/layout.tsx`)

**Interfaces:**
- Produces: `@/shared/context/AppContext` (`AppProvider`, hooks de contexto, sin cambios).

- [ ] **Step 1: Mover**

Run: `git mv lib/AppContext.tsx shared/context/AppContext.tsx`

- [ ] **Step 2: Re-apuntar imports**

Run:
```bash
git grep -l "@/lib/AppContext" -- '*.ts' '*.tsx' | xargs sed -i 's#@/lib/AppContext#@/shared/context/AppContext#g'
```

- [ ] **Step 3: Verificar gate**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: mover AppContext a shared/context"
```

---

### Task 9: Migrar componentes compartidos → `shared/components/` (y fix de Onboarding)

**Files:**
- Move: `app/components/AppShell.tsx`, `app/components/NavBar.tsx`, `app/components/Onboarding.tsx` → `shared/components/`
- Modify: importadores de `@/app/components/AppShell` (y relativos); `shared/components/Onboarding.tsx` para usar `@/shared/motion`

**Interfaces:**
- Produces: `@/shared/components/{AppShell,NavBar,Onboarding}`.
- Nota: `ResearchModule.tsx` NO se mueve acá (es feature; va en Task 12).

- [ ] **Step 1: Mover los tres componentes**

Run:
```bash
git mv app/components/AppShell.tsx shared/components/AppShell.tsx
git mv app/components/NavBar.tsx shared/components/NavBar.tsx
git mv app/components/Onboarding.tsx shared/components/Onboarding.tsx
```

- [ ] **Step 2: Re-apuntar imports absolutos**

Run:
```bash
git grep -l "@/app/components/AppShell" -- '*.ts' '*.tsx' | xargs sed -i 's#@/app/components/AppShell#@/shared/components/AppShell#g'
git grep -l "@/app/components/NavBar" -- '*.ts' '*.tsx' | xargs sed -i 's#@/app/components/NavBar#@/shared/components/NavBar#g'
git grep -l "@/app/components/Onboarding" -- '*.ts' '*.tsx' | xargs sed -i 's#@/app/components/Onboarding#@/shared/components/Onboarding#g'
```
Los imports relativos entre estos tres (ej. `./Onboarding`, `./NavBar`) siguen válidos porque se movieron juntos.

- [ ] **Step 3: Fix de la única violación real — Onboarding usa `framer-motion` directo**

En `shared/components/Onboarding.tsx`, reemplazar el import directo de Framer Motion por los wrappers de `@/shared/motion`. Inspeccionar qué usa (`motion.*`, `AnimatePresence`, etc.) y:
- Si `shared/motion` ya exporta equivalentes → cambiar el import a `import { ... } from '@/shared/motion'`.
- Si falta algún primitivo → exportarlo desde `shared/motion/index.tsx` y consumir desde ahí.
Objetivo: `shared/components/Onboarding.tsx` sin `from 'framer-motion'`.

- [ ] **Step 4: Verificar gate + animación de onboarding a ojo**

Run: `pnpm exec tsc --noEmit && pnpm test && pnpm build`
Expected: exit 0. Smoke manual: el flujo de onboarding sigue animando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: mover AppShell/NavBar/Onboarding a shared/components y Onboarding usa shared/motion"
```

---

### Task 10: Retirar `lib/` y verificación integral

**Files:**
- Delete: `lib/` (debe quedar vacío)

**Interfaces:**
- Produces: árbol sin `lib/`; toda referencia transversal vía `@/shared/*`.

- [ ] **Step 1: Confirmar que no quedan referencias a `@/lib/`**

Run: `git grep -n "@/lib/" -- '*.ts' '*.tsx'`
Expected: **sin resultados** (exit 1 / vacío). Si aparece alguno, re-apuntarlo al `@/shared/...` correspondiente.

- [ ] **Step 2: Confirmar que `lib/` está vacío y borrarlo**

Run:
```bash
ls -A lib
rmdir lib
```
Expected: `ls` no lista archivos; `rmdir` OK.

- [ ] **Step 3: Verificación integral**

Run: `pnpm exec tsc --noEmit && pnpm test && pnpm build`
Expected: exit 0 en los tres.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: retirar lib/ (todo migrado a shared/)"
```

---

### Task 11: Reconfigurar praxis-guard + regla custom `import-boundaries`

**Files:**
- Modify: `.praxis-guard/config.json`
- Create: `.praxis-guard/rules/import-boundaries.mjs`

**Interfaces:**
- Produces: arquitectura apuntando a `features`/`shared`; `forbidden-imports` off; regla custom con excepciones por carpeta.

- [ ] **Step 1: Escribir `.praxis-guard/config.json`**

```json
{
  "exclude": ["node_modules/", ".next/", "dist/", "build/", ".git/", "coverage/",
              "out/", ".tmp/", ".todo/", ".understand-anything/", ".claude/",
              ".praxis-guard/", "docs/", "public/"],
  "architecture": { "strategy": "by-feature", "root": ".", "featuresDir": "features", "sharedDirs": ["shared"] },
  "commit": { "block": true },
  "rules": {
    "file-responsibility": { "maxLines": 50 },
    "architecture-coherence": { "enabled": true },
    "server-client-boundaries": { "enabled": true },
    "feature-deps": { "enabled": true },
    "folder-placement": { "enabled": true, "placement": [
      { "kind": "página/route de Next", "match": "^(page|layout|route|template|loading|error|not-found|default)\\.(tsx|ts)$", "allowed": ["app/**"] }
    ] },
    "forbidden-imports": { "enabled": false }
  }
}
```

- [ ] **Step 2: Crear la regla custom `.praxis-guard/rules/import-boundaries.mjs`**

```js
// .praxis-guard/rules/import-boundaries.mjs
const IMPORT_RE = /^\s*(?:import\b[^'"]*|export\b[^'"]*from\s*|.*\brequire\s*\()\s*['"]([^'"]+)['"]/;
const BOUNDARIES = [
  { module: '@supabase/supabase-js', allowDirs: ['shared/db/', 'app/api/'],
    message: 'usá el singleton de shared/db (en cliente); el cliente directo solo en app/api/ o shared/db.' },
  { module: 'framer-motion', allowDirs: ['shared/motion/'],
    message: 'usá los componentes de shared/motion (no Framer Motion directo).' },
];
export default function importBoundaries(content, filePath, _config = {}, _full = {}) {
  const path = String(filePath).replace(/\\/g, '/');
  const out = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = IMPORT_RE.exec(lines[i]);
    if (!m) continue;
    const src = m[1];
    for (const b of BOUNDARIES) {
      if (src !== b.module && !src.startsWith(b.module + '/')) continue;
      if (b.allowDirs.some((d) => path.includes(d))) continue;
      out.push({ rule: 'import-boundaries', line: i + 1, severity: 'warn',
        message: `Import prohibido "${src}": ${b.message}` });
    }
  }
  return out;
}
```

- [ ] **Step 3: Validar que la config y la regla cargan**

Run: `node /home/wagner/.claude/plugins/cache/nextjs-praxis-guard/nextjs-praxis-guard/0.25.2/bin/praxis-audit.mjs --full --deep --dir .`
Expected: corre sin `⚠ regla custom no cargó`. Verificar que NO hay findings de `import-boundaries` en `app/api/*` ni `shared/db`/`shared/motion` (excepciones OK), y que `feature-deps`/`folder-placement` no rompen. Anotar findings esperados (ej. `file-responsibility` por `maxLines: 50`).

- [ ] **Step 4: Commit**

```bash
git add .praxis-guard/config.json .praxis-guard/rules/import-boundaries.mjs
git commit -m "chore: praxis-guard apunta a features/shared + regla custom import-boundaries"
```

---

### Task 12: Fase 1 — migrar feature `research`

**Files:**
- Move: `app/components/ResearchModule.tsx` → `features/research/components/ResearchModule.tsx`
- Create: `features/research/index.ts`
- Modify: `app/(app)/research/page.tsx`

**Interfaces:**
- Produces: `@/features/research` exporta `ResearchModule` (default o nombrado, mantener el actual) + `access`.
- Consumes: `shared/*` (lo que ResearchModule ya usaba, ahora vía `@/shared/...`).

- [ ] **Step 1: Mover el componente a la feature**

Run: `git mv app/components/ResearchModule.tsx features/research/components/ResearchModule.tsx`

- [ ] **Step 2: Crear la API pública `features/research/index.ts`**

```ts
// features/research/index.ts — API pública de la feature research
export { default as ResearchModule } from './components/ResearchModule'
// Convención access-aware (la consume el plan de control de acceso; sin lógica todavía)
export const access = { module: 'research' } as const
```
> Si `ResearchModule` es export nombrado en vez de default, ajustar el re-export en consecuencia.

- [ ] **Step 3: Adelgazar `app/(app)/research/page.tsx`**

Reemplazar el import `@/app/components/ResearchModule` por la API pública de la feature. La página queda fina:
```tsx
import { ResearchModule } from '@/features/research'

export default function ResearchPage() {
  return <ResearchModule />
}
```
> Mantener cualquier prop/wrapper que la página actual le pasaba a `ResearchModule`.

- [ ] **Step 4: Verificar gate + ruta a ojo**

Run: `pnpm exec tsc --noEmit && pnpm test && pnpm build`
Expected: exit 0. Smoke manual: `/research` renderiza igual que antes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(research): migrar ResearchModule a features/research con API pública"
```

---

### Task 13: Smoke test de la feature `research`

**Files:**
- Create: `features/research/index.test.ts`

**Interfaces:**
- Consumes: `@/features/research` (`ResearchModule`, `access`).

- [ ] **Step 1: Escribir el smoke test (debe fallar primero si el export no existe)**

```ts
import { describe, it, expect } from 'vitest'
import * as research from '@/features/research'

describe('features/research API pública', () => {
  it('expone ResearchModule', () => {
    expect(research.ResearchModule).toBeDefined()
  })
  it('declara su access (convención access-aware)', () => {
    expect(research.access).toEqual({ module: 'research' })
  })
})
```

- [ ] **Step 2: Correr el test**

Run: `pnpm test`
Expected: PASS (los dos casos). Si falla por resolución de `@/`, confirmar que Vitest resuelve el alias (config de Vitest/tsconfig paths); si no, agregar el alias a la config de Vitest como sub-paso.

- [ ] **Step 3: Commit**

```bash
git add features/research/index.test.ts
git commit -m "test(research): smoke test de la API pública de la feature"
```

---

## Self-Review

- **Cobertura del spec:** gate CI+pre-push (T1,T2) ✓ · estructura features/shared (T3) ✓ ·
  retiro de lib→shared con re-apuntado (T4–T10) ✓ · praxis-guard reconfig + regla custom (T11) ✓ ·
  piloto research con index.ts + access + página fina (T12) ✓ · testing dirigido: backbone en cada
  tarea + smoke test (T13) ✓. Fase 2+ queda fuera (un plan por feature, según spec).
- **Placeholders:** los moves usan comandos exactos; el único punto con criterio es el fix de
  Onboarding (T9 S3) y el shape de export de ResearchModule (T12 S2) — ambos dependen del
  contenido real del archivo y traen instrucción explícita de cómo resolver.
- **Consistencia de tipos/paths:** mapeo de imports `@/lib/* → @/shared/*` consistente en todas
  las tareas; `@/features/research` exporta `ResearchModule` + `access`, usados igual en T12/T13.

## Riesgo conocido a vigilar en ejecución
- `pnpm build` puede requerir variables de entorno; T2 incluye dummies, ajustar si Next pide más.
- Vitest debe resolver el alias `@/` para T13; si no lo hace, configurarlo antes de cerrar T13.
- El entorno de ejecución puede tener un firewall (ankify) que gatea comandos shell — resolver
  por fuera del plan; no afecta el diseño.
