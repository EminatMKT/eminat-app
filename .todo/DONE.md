# Completados — eminat-app

_Última actualización: 2026-07-02_

- [x] **[Login] Agregar `@stratix360.com` a dominios autorizados (arreglo provisional)** — la allowlist de login estaba quemada y duplicada; faltaba el dominio nuevo. ⚠️ Provisional: los dominios siguen hardcodeados en código. La idea a futuro es controlarlos desde el panel de admin (ver TODO). _(creado por: EminatMKT · 2026-07-02)_ ✓ _resuelto: `@stratix360.com` agregado; allowlist centralizada en `shared/constants/domain.ts` (`DOMINIOS_VALIDOS`); emails de config a `shared/constants/contacts.ts`; `FULL_WIDTH_FIELDS` deduplicado; mensaje de error i18n interpola la allowlist real (`{domains}`). PR #25, rama `feature/dominios-autorizados-stratix360` — responsable: EminatMKT · 2026-07-02_

- [x] **[Infra] Entornos Supabase separados (prod/dev)** — dev y producción compartían la misma instancia de Supabase (ref `ruedelunbtaomhrzgelc`); cada login/prueba en local contaminaba datos reales de producción. _(creado por: SmithDR · 2026-06-11)_ ✓ _resuelto: proyecto Supabase dev `eminat-app-dev` (ref `ydcadspinryybextlvyi`) en org free; vars separadas por entorno (`.env.local`→dev, Vercel→prod); flujo de migraciones con la CLI (`db pull` baseline de prod → `db push` a dev); salvaguarda `isProdDb`/`superRefine` en `lib/env.client.ts` + badge "DEV" en `AppShell`. Commiteado en `feature/env-module` — responsable: SmithDR · 2026-06-12_

- [x] **[.gitignore] Agregar `.todo/` al .gitignore** — El directorio `.todo/` es tooling local, no debe commitearse al repo. _(creado por: SmithDR · 2026-06-09)_ ✓ _resuelto: .todo/ en línea 14 del .gitignore, commiteado en feature/env-module — responsable: SmithDR · 2026-06-11_

---

- [x] **[Infra] Módulo centralizado de variables de entorno** — `lib/env.client.ts` (vars NEXT_PUBLIC_* + NODE_ENV + APP_ENV) y `lib/env.server.ts` (SUPABASE_SERVICE_ROLE_KEY + RESEND_API_KEY) con validación Zod al arrancar. Separación cliente/servidor necesaria para Next.js App Router. Instalación de Zod 4.4.3. _(creado por: SmithDR · 2026-06-11)_ ✓ _resuelto: commits 249b22c, ce968e7 en feature/env-module — responsable: SmithDR · 2026-06-11_

- [x] **[Infra] Migración de `process.env` a módulos centralizados** — 8 archivos migrados: `lib/supabase.ts`, `app/api/admin/create-user`, `delete-user`, `reassign-and-delete`, `reset-password`, `update-user`, `app/api/mail/campaigns`, `mail/send`. Eliminados checks manuales redundantes de vars. _(creado por: SmithDR · 2026-06-11)_ ✓ _resuelto: commit f2cfe50 en feature/env-module — responsable: SmithDR · 2026-06-11_

- [x] **[Infra] Fix URL Supabase en `.env.local`** — Removido el path `/rest/v1/` del valor de `NEXT_PUBLIC_SUPABASE_URL`. La librería `@supabase/ssr` construye los endpoints internamente desde la URL base. _(creado por: SmithDR · 2026-06-11)_ ✓ _resuelto: corrección manual en .env.local — responsable: SmithDR · 2026-06-11_

- [x] **[Infra] Supabase health check al arrancar el servidor** — `instrumentation.ts` en la raíz del proyecto. Usa `auth.admin.listUsers` (independiente de tablas del dominio) vía `NEXT_RUNTIME === 'nodejs'`. Muestra ✓/✗ en consola al iniciar `next dev` o `next start`. _(creado por: SmithDR · 2026-06-11)_ ✓ _resuelto: commits 89e5b77, 6e896e7 en feature/env-module — responsable: SmithDR · 2026-06-11_

- [x] **[Docs] Spec y plan de implementación del módulo env** — `docs/superpowers/specs/2026-06-11-env-module-design.md` y `docs/superpowers/plans/2026-06-11-env-module.md` con diseño aprobado y 13 tareas documentadas. _(creado por: SmithDR · 2026-06-11)_ ✓ _resuelto: commits 6358008, 61d2ebc en development — responsable: SmithDR · 2026-06-11_

---

## Refactor by-feature — Fases 0/1/2/3 (cerrado 2026-06-20)

- [x] **Epic — Refactor by-feature (Fase 0 + Fase 1) · T1–T13** — Gate pre-push + CI, scaffold `features/`+`shared/`, migración de `lib/` (companies/motion/db/permissions/AppContext/componentes) a `shared/`, retiro de `lib/`, reconfig praxis-guard, piloto + smoke test de research. _(creado por: SmithDR · 2026-06-17)_ ✓ _resuelto: completo — `lib/` retirado, `.githooks/pre-push` + `.github/workflows/ci.yml` activos, `features/`+`shared/` poblados, `features/research/index.test.ts` presente (PRs #1–#11) — responsable: EminatMKT, SmithDR · 2026-06-20_

- [x] **Fase 2 — Descomponer todos los mega-módulos a `features/<x>/`** — page.tsx monolíticos → Module + página fina + components/ + hooks/ + context, un componente por archivo. _(creado por: EminatMKT · 2026-06-18)_ ✓ _resuelto: directorio, accounting, overview, admin, medical, research, cobranzas, stratix-mkt (1723 líneas) — PRs #3–#13 — responsable: EminatMKT · 2026-06-20_

- [x] **shared/ui — unificar componentes comunes** — TabButton, AccessDenied (adoptado en medical/admin), StatCard (accounting), BarChartCard (research), StratixKpiCard. _(creado por: EminatMKT · 2026-06-19)_ ✓ _resuelto: PR #14 — responsable: EminatMKT · 2026-06-20_

- [x] **[Refactor] Desmenuzar AppContext** — `shared/context/AppContext.tsx` (467 líneas) → constantes a `shared/constants/` (domain/directorio), tema a `shared/theme/tokens`, provider fino + `useAppData`/`loadAppData`/`useClock`/`SessionErrorScreen`. _(creado por: EminatMKT · 2026-06-19)_ ✓ _resuelto: PRs #15, #16 — responsable: EminatMKT · 2026-06-20_

- [x] **[DB/Arquitectura] Centralizar el acceso a datos (capa de repositorio)** — Todas las queries `supabase.from(...)` dispersas → `shared/data/` (usuarios, actividades, notificaciones+realtime, research, cobranzas) + `TABLES`/`COLUMNS` (única fuente) + auth en `shared/db/auth.ts`. Aísla el motor de DB. _(creado por: EminatMKT · 2026-06-19)_ ✓ _resuelto: PR #18 — responsable: EminatMKT · 2026-06-20_

- [x] **[Docs] Convención canónica de estructura by-feature** — Documentar en `features/README.md` la convención by-feature para no re-decidirla por módulo: estructura de feature (`index.ts` público + `index.test.ts`, `components/`, `hooks/`, `data.ts`, `types.ts`), página fina (solo monta el Module, límite `use client`), un componente = un archivo, `.map()` con su propio componente, nombres que describen el rol, tests co-locados híbridos, datos estáticos → `data.ts`, genérico usado por +1 feature → `shared/components/ui/`. _(creado por: EminatMKT · 2026-06-18)_ ✓ _resuelto: PR #7, commit 12260c3 (`features/README.md`, solo doc) — responsable: EminatMKT · 2026-06-29T19:38-05:00_

---

## Roles dinámicos + producción (cerrado 2026-06-29)

- [x] **[DB] Control de acceso configurable por el admin** — Tablas `roles`+`role_modules`; pantalla en Admin para que el rol `admin` cree tipos y asigne/quite módulos; `shared/auth/permissions.ts` lee de la DB en vez de la matriz hardcodeada. Modelo: `label` único + `key` fija + `is_system` (protege `admin` y `sin_asignar`) + módulos. Default = `sin_asignar` (solo Home). `admin` = único tier total (se elimina "superadmin"). Seguridad: trigger `prevent_rol_self_change` + `requireAdmin` + guard del último admin. RLS reconciliada vía `has_module(slug)`. _(creado por: EminatMKT · 2026-06-19 | iniciado: 2026-06-26)_ ✓ _resuelto: PR #21 development→main mergeado; migración aplicada y verificada en PROD (`ruedelunbtaomhrzgelc`): 8 roles, 15 role_modules, FK `usuarios_rol_fkey`, funcs is_admin/has_module/prevent_rol_self_change, 0 roles fuera de catálogo (superadmin→admin, colaborador/pasante→stratix360); backups en `supabase/rollback/predump-20260629-*.sql` — responsable: EminatMKT · 2026-06-29T19:38-05:00_

- [x] **[Infra] Entornos en 3 tiers (local | development | production)** — Refactor del modelo de entornos a 3 tiers vía `APP_ENV`: `local` (Supabase local), `development` (Vercel Preview + dev remoto `ydcadspinryybextlvyi`), `production` (Vercel main + prod `ruedelunbtaomhrzgelc`). Deriva `isProdDb`/`isDevDb` (badge "DEV") + `superRefine` que rompe el build si un tier no-production apunta a la base de prod; `.gitignore` endurecido (todos los `.env*` salvo `.env.example`). _(creado por: EminatMKT · 2026-06-26)_ ✓ _resuelto: commits 1778a4b, bcf9107, 22021e1; PR #20→development y PR #21→main (en prod). El bug client-side (la validación corría en el browser leyendo la var sin prefijo `NEXT_PUBLIC_` → `undefined`→`local` → `ZodError` solo en prod) se corrigió renombrando a `NEXT_PUBLIC_APP_ENV` (PR #22, en main; sync a development por PR #23) — responsable: EminatMKT · 2026-06-29T19:38-05:00_
