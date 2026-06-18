# Refactor a arquitectura by-feature (`features/` + `shared/`) — Diseño

**Fecha:** 2026-06-17
**Estado:** Aprobado para pasar a plan de implementación
**Autor:** SmithDR (con asistencia)

## Contexto y problema

Hoy `eminat-app` NO tiene una carpeta de features. Lo que parecían features son las
**páginas de Next.js** (`app/(app)/<ruta>/page.tsx`), que acumulan toda la lógica de negocio:
`stratix-mkt` (1724 líneas), `medical` (1100), `admin` (748), `cobranzas` (468),
`accounting` (412). Además `ResearchModule.tsx` (1069) vive en `app/components/` pese a ser
lógica endémica de la feature *research*.

Esto genera tres dolores simultáneos (los tres son driver del refactor):
1. **Archivos gordos** difíciles de mantener y testear.
2. **Sin encapsulamiento ni límites**: cualquier archivo importa cualquier cosa; no hay
   API pública por módulo.
3. **Sin convención escalable**: lo nuevo no tiene dónde nacer "bien".

Una auditoría profunda con `nextjs-praxis-guard` confirmó 0 findings de arquitectura
justamente porque no hay estructura by-feature real que evaluar.

## Objetivos

- `app/` queda **solo para ruteo** (páginas finas).
- Cada módulo de negocio es una **feature encapsulada** con API pública (`index.ts`).
- Todo lo transversal vive en **una sola casa** (`shared/`), retirando `lib/`.
- `nextjs-praxis-guard` queda **configurado correctamente** para la estructura objetivo y
  empieza a enforcing los límites (`feature-deps`, `server-client-boundaries`).
- Dejar el terreno **access-aware** para que el control de acceso por rol (plan aparte) solo
  rellene una convención ya existente.

## Fuera de alcance (plan separado)

El rediseño del **control de acceso por rol/tipo de usuario** (refinar la matriz de
`permissions.ts`, gating por feature/acción) es un **segundo ciclo** (su propio
brainstorm → spec → plan). Es un cambio de *comportamiento*; este refactor es *estructural*.
Mezclarlos haría los PRs irrevisables. Este diseño solo deja la **convención** preparada.

## Estructura objetivo

```
app/                          ← SOLO ruteo
  (app)/<ruta>/page.tsx        → fina: importa la feature y la renderiza
  (app)/layout.tsx             ← se queda (envuelve con AppProvider)
  api/...                      ← se queda (endpoints server)
  login/  reset-password/      ← se quedan (páginas auth)
features/<modulo>/            ← RAÍZ; un módulo de negocio por carpeta
  components/                  (UI endémica de la feature)
  hooks/                       (lógica de la feature)
  types.ts                     (tipos de la feature; opcional)
  index.ts                     ← API PÚBLICA: único punto de import externo
shared/                       ← RAÍZ; absorbe y RETIRA lib/
  components/                  (AppShell, NavBar, Onboarding)
  context/                     (AppContext)
  auth/                        (permissions)
  db/                          (supabase, env.client, env.server, session)
  motion/                      (motion.tsx)
  constants/                   (companies)
```

Imports vía `@/features/*` y `@/shared/*`. **No requiere tocar aliases**: `tsconfig.json` ya
mapea `"@/*": ["./*"]` desde la raíz.

Features (= módulos de negocio): `stratix`, `medical`, `research`, `cobranzas`, `accounting`,
`admin`, `directorio`. Las "en construcción" (`finanzas`, `th-hr`) nacen mínimas. El
launchpad/overview se tratan como páginas simples (o una feature `home` chica) — a decidir en
su fase.

## Convenciones

1. **Una feature solo se importa por su `index.ts`** — nunca `@/features/x/components/Foo`
   desde afuera de la feature. (Enforced por `feature-deps`.)
2. **Regla de ubicación:** lo usa >1 feature → `shared/`; lo usa 1 sola → `features/esa/`.
3. **Frontera client/server:** al mover, respetar `'use client'`; no meter `next/headers`/`fs`
   en cliente. (Ayuda `server-client-boundaries`.)
4. **Access-aware (solo convención, sin lógica nueva):** cada `features/<x>/index.ts` declara
   su requisito de acceso, p.ej.:
   ```ts
   export const access = { module: 'medical' } as const
   ```
   El plan de control de acceso (aparte) consume esto; ahora solo dejamos el hueco.

## Configuración de `nextjs-praxis-guard` (objetivo)

> **Timing:** esta config se aplica en la **Fase 0**, cuando `features/` y `shared/` ya
> existen. Aplicarla antes dejaría a `feature-deps`/`folder-placement` sin nada que evaluar.
> El `featuresDir: app/(app)` actual es **incorrecto** (son páginas, no features) y se corrige
> acá. El `publicEntry` con `page.tsx` también era del mapeo viejo y vuelve al default.

`.praxis-guard/config.json` objetivo:

```json
{
  "exclude": ["node_modules/", ".next/", "dist/", "build/", ".git/", "coverage/",
              "out/", ".tmp/", ".todo/", ".understand-anything/", ".claude/",
              ".praxis-guard/", "docs/", "public/"],
  "architecture": {
    "strategy": "by-feature",
    "root": ".",
    "featuresDir": "features",
    "sharedDirs": ["shared"]
  },
  "commit": { "block": true },
  "rules": {
    "file-responsibility": { "maxLines": 50 },
    "architecture-coherence": { "enabled": true },
    "server-client-boundaries": { "enabled": true },
    "feature-deps": { "enabled": true },
    "folder-placement": {
      "enabled": true,
      "placement": [
        { "kind": "página/route de Next",
          "match": "^(page|layout|route|template|loading|error|not-found|default)\\.(tsx|ts)$",
          "allowed": ["app/**"] }
      ]
    },
    "forbidden-imports": { "enabled": false }
  }
}
```

Notas:
- `feature-deps` usa `publicEntry` default `["index.ts","index.tsx"]` (no se declara).
- `folder-placement` arranca con UNA regla segura: los archivos especiales de Next solo viven
  en `app/**`. Es de bajo ruido (ya se cumple) y evita que vuelva lógica de ruteo afuera.
  Se puede extender después.
- `forbidden-imports` (built-in) **se apaga**: no puede exceptuar por path y producía falsos
  positivos (6 rutas API server-side que legítimamente crean cliente service-role de
  `@supabase/supabase-js`, y el propio wrapper `motion`). Se reemplaza por una **regla custom**
  con excepciones por carpeta (abajo).

### Regla custom: `.praxis-guard/rules/import-boundaries.mjs`

Enforcing las convenciones de import con **excepciones por carpeta** (lo que `forbidden-imports`
no puede). Contrato de regla de praxis-guard: `(content, filePath, config, full) => findings[]`.

```js
// .praxis-guard/rules/import-boundaries.mjs
// Convenciones del proyecto: usar los wrappers/singletons, no las libs crudas,
// salvo en las carpetas donde el wrapper/singleton vive (o en server routes).
const IMPORT_RE = /^\s*(?:import\b[^'"]*|export\b[^'"]*from\s*|.*\brequire\s*\()\s*['"]([^'"]+)['"]/;

const BOUNDARIES = [
  { module: '@supabase/supabase-js',
    allowDirs: ['shared/db/', 'app/api/'],            // singleton + server routes (service-role)
    message: 'usá el singleton de shared/db (en cliente) — el cliente directo solo en app/api/ o shared/db.' },
  { module: 'framer-motion',
    allowDirs: ['shared/motion/'],                    // solo el wrapper
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
      if (b.allowDirs.some((d) => path.includes(d))) continue;   // carpeta exenta
      out.push({ rule: 'import-boundaries', line: i + 1, severity: 'warn',
        message: `Import prohibido "${src}": ${b.message}` });
    }
  }
  return out;
}
```

> La sintaxis exacta (campos del finding, firma) se valida al crear el archivo en Fase 0
> corriendo la auditoría; si el motor reporta `⚠ regla custom no cargó`, se ajusta.

## Fases de migración

### Fase 0 — Andamiaje (bajo riesgo, sin cambiar comportamiento)
- **Montar el gate mecánico PRIMERO** (CI + pre-push, ver Enforcing) para que proteja todas
  las fases siguientes. Agregar script `"typecheck": "tsc --noEmit"` a `package.json`.
- Crear `features/` y `shared/` (con subcarpetas y un README de convención).
- Mover lo transversal: `lib/*` → `shared/{auth,db,context,motion,constants}`;
  `app/components/{AppShell,NavBar,Onboarding}` → `shared/components/`.
- Reapuntar imports (mecánico con alias `@/`). **Retirar `lib/`.**
- Aplicar la config objetivo de praxis-guard + crear la regla custom `import-boundaries`.
- **Verificación:** `tsc` + `next build` OK + Vitest en verde. Comportamiento idéntico.

### Fase 1 — Feature piloto: `research`
- Mover `app/components/ResearchModule.tsx` → `features/research/` (dividir en
  `components/` + `hooks/` según responsabilidades), exponer `index.ts`.
- `app/(app)/research/page.tsx` queda fina (importa `@/features/research`).
- Sumar un **smoke test** mínimo de la feature.
- Sirve de molde para el resto.
- **Verificación:** igual que Fase 0 + smoke test.

### Fase 2+ — Decomposición por feature (NO es traslado)

> Distinción clave: Fase 0 y el move `lib→shared` SON "mover archivos". Fase 2+ **no**: es
> partir un `page.tsx` gordo (hasta 1724 líneas) en componentes + hooks con una API pública.
> Ahí se cumplen los objetivos de "domar archivos" y "encapsular".

**Una feature por PR**, en secuencia peor-primero. No se arranca la siguiente hasta **mergear
la anterior con el gate en verde** (cada feature es independiente, revisable y reversible).

Orden: `stratix-mkt` (1724) → `medical` (1100) → `admin` (748) → `cobranzas` (468) →
`accounting` (412) → `directorio` (59). (`finanzas`/`th-hr` nacen mínimas.)

#### Playbook por feature (mismo para todas)
Cada feature de Fase 2+ se ejecuta con estos pasos (se concretan como tareas en el plan):
1. **Inventario** de responsabilidades del `page.tsx`: qué es UI, qué es lógica/estado, qué es
   data-fetching, qué constantes.
2. **Agrupar y extraer** → `features/<x>/components/` (UI), `features/<x>/hooks/` (lógica/estado),
   `features/<x>/types.ts`. Lo que resulte transversal (lo usa otra feature) sube a `shared/`.
3. **Definir la API pública** `features/<x>/index.ts` (lo único importable desde afuera) + el
   stub `access` (convención access-aware).
4. **Adelgazar la página**: `app/(app)/<ruta>/page.tsx` queda solo importando y renderizando
   la feature.
5. **Tests dirigidos** (ver Estrategia de testing): smoke del `index.ts` + unit de la lógica
   pura extraída.
6. **Definition of Done:** gate en verde (tsc + test + build) + `praxis-audit` sin findings de
   arquitectura nuevos no esperados + smoke manual de la ruta. Un PR, una feature.

#### Features grandes (`stratix-mkt`, `medical`)
Por tamaño (1724 / 1100 líneas) son casi un mini-proyecto. Cuando llegue su turno, si la
decomposición no es evidente del inventario, obtienen **su propio pase de diseño** (sub-spec
breve) antes de ejecutar el playbook — no se fuerza el detalle ahora desde afuera del archivo.

> **Dónde vive el detalle:** este spec fija el playbook + secuencia + DoD. El desglose concreto
> de cada feature (qué componente/hook sale, nombres, firmas) se arma como tareas en el **plan
> de implementación** (writing-plans), donde se ve el archivo real.

## Estrategia de testing (dirigida)

Es un refactor estructural (mover sin cambiar comportamiento), así que el grueso de la
seguridad lo dan checks baratos; los tests nuevos se agregan donde pagan, no por todos lados.

**Backbone (red principal, cada fase):**
- `tsc` (typecheck) — atrapa imports rotos y tipos al mover (el que más paga).
- `next build` — atrapa errores de bundle y fronteras client/server.
- Vitest existente en verde — regresión (setup ya presente: `lib/session/index.test.ts`).

**Tests nuevos (alto ROI, aprovechando la extracción):**
- **Smoke test por feature migrada:** un test mínimo del `index.ts` público (que renderice /
  que los exports existan). Documenta el contrato y atrapa roturas de extracción. Prioridad en
  los gordos (`stratix`, `medical`).
- **Unit tests de lógica pura extraída:** al sacar cálculos enredados de los `page.tsx` hacia
  `hooks/`/utils aislados, testear esas unidades (recién ahí son testeables — es un objetivo
  del refactor).

**Fuera de alcance acá:** caracterización exhaustiva pre-movida. El testing protagonista
(TDD) corresponde al **plan de control de acceso** (cambio de comportamiento), no a este.

## Enforcing de testing/checks (gate mecánico)

Un bullet en este doc NO garantiza que cada fase corra los tests. La garantía es
**automatización que falla fuerte** y que no dependa de la memoria de nadie. Se monta en
**Fase 0, antes de migrar**. Hoy el repo NO tiene `.github/` ni hooks.

**Capa dura — CI gate (GitHub Action como required check):**
- Workflow `.github/workflows/ci.yml` en `pull_request` (y push a `main`/`development`).
- Pasos con `pnpm`: instalar deps → `pnpm exec tsc --noEmit` → `pnpm test` (`vitest run`) →
  `pnpm build`.
- Marcarlo **required check** en branch protection: si algo está rojo, **el PR no mergea**.
  No se puede bypassear desde local — esta es la garantía real.
- **praxis-audit en CI (caveat):** el plugin corre desde el cache de Claude, no es dependencia
  del proyecto, así que en el runner no está instalado "gratis". Opciones a resolver en Fase 0:
  usar el workflow `github-action` que provee el plugin, o vendorizar/instalar el binario en CI
  e invocar `praxis-audit --full --deep --gate`. Si no se resuelve rápido, el gate de CI
  arranca con tsc+test+build (que ya cubren el grueso) y praxis-audit queda como check local.

**Capa rápida — pre-push local:**
- Sin husky en el repo → usar hooks versionados: `git config core.hooksPath .githooks` +
  `.githooks/pre-push` committeado que corre `pnpm exec tsc --noEmit && pnpm test`
  (sin `build`, para que sea rápido; el build queda para CI).
- Da feedback antes de pushear, pero es **bypasseable con `--no-verify`** → es comodidad, no
  la garantía. Por eso la capa dura es CI.

Resultado: cada fase del refactor no se puede dar por cerrada/mergear sin tsc + tests + build
en verde — independiente de que el ejecutor "se acuerde".

## Verificación por fase

Como el comportamiento no cambia, cada fase cierra con:
- `pnpm tsc --noEmit` (typecheck) en verde.
- `pnpm build` (`next build`) OK.
- Tests Vitest en verde (existentes + los nuevos dirigidos de la fase).
- Auditoría `praxis-audit --full --deep` sin nuevos findings de arquitectura no esperados.
- Smoke manual de la(s) ruta(s) tocada(s).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Churn de imports al retirar `lib/` | Alias `@/` ya existe; cambio mecánico; un PR por fase. |
| Romper frontera client/server al mover | `server-client-boundaries` lo marca; respetar `'use client'`. |
| Deps circulares entre features | `feature-deps` las detecta. |
| `maxLines: 50` genera mucho ruido | Es decisión explícita del equipo; se puede revisar o usar `baseline`. |
| Regla custom no carga | Se valida en Fase 0 con la auditoría; el motor avisa sin abortar. |

## Decisiones tomadas (resumen)

- Estructura `features/` + `shared/` en raíz; `app/` solo ruteo. **(aprobado)**
- `lib/` se retira hacia `shared/`. **(aprobado)**
- Migración piloto-incremental empezando por `research`. **(aprobado)**
- Control de acceso por rol = **plan separado**, posterior; refactor queda access-aware. **(aprobado)**
- Testing **dirigido**: backbone (tsc + build + Vitest) + smoke por feature + unit tests de
  lógica pura extraída. TDD queda para el plan de control de acceso. **(aprobado)**
- Enforcing: **CI gate (required check) + pre-push local**, montado en Fase 0 antes de migrar.
  La garantía dura es el CI; el pre-push es feedback rápido. **(aprobado)**
- Fase 2+ es **decomposición, no traslado**: spec fija playbook repetible + secuencia + DoD;
  el detalle por feature va al plan; `stratix`/`medical` pueden tener sub-spec. **(aprobado)**
- praxis-guard: `featuresDir: features`, `sharedDirs: [shared]`, `feature-deps` on,
  `folder-placement` con regla Next, `forbidden-imports` off reemplazado por regla custom
  `import-boundaries`. **(este documento)**
