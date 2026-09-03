# Eminat App — Contexto del proyecto

Sistema operativo interno de Eminat Group. Plataforma de gestión empresarial desarrollada con Next.js 14 + Supabase. Desplegada en Vercel en `app.stratixsolutions.us`.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion
- **Backend/DB:** Supabase (PostgreSQL + Auth + Realtime)
- **Email:** Resend (con `@react-email/components`)
- **Deploy:** Vercel

## Entornos y base de datos

**Dos tiers, una base por tier.** Lo declara el enum de `NEXT_PUBLIC_APP_ENV` en
`src/shared/db/env.client.ts`:

| Tier | Base | Ref / URL | Dónde se configuran las vars |
|---|---|---|---|
| **`local`** | Supabase local (Docker, `supabase start`) | `http://127.0.0.1:54321` | `.env.local` (gitignored), `NEXT_PUBLIC_APP_ENV=local` |
| **`production`** | `eminat-app` (org Pro) | `ruedelunbtaomhrzgelc` | Vercel → scope Production |

**No hay tier `development`.** Se eliminó el 28/08/2026, junto con la rama `development` y el
proyecto Supabase `eminat-app-dev` (`ydcadspinryybextlvyi`). Eran una tercera base que había que
sincronizar a mano —el repo llegó a tener tres ramas `chore/sync-*` para eso— y su único
consumidor era Vercel Preview; el CI nunca la tocó, corre contra Supabase local (`supabase
start`). Toda rama sale de `main` y se prueba en local.

- El prefijo `NEXT_PUBLIC_` no es opcional: la validación corre también en el cliente
  (`isProdDb`/badge) y sin el prefijo Next no inyecta la var al bundle.
- `src/shared/db/env.client.ts` exporta `isProdDb`/`isDevDb` y un `superRefine` que **rompe el
  build** si un tier que no es `production` apunta al ref de la base de prod.
- `isDevDb` es true para `local`; con eso `DevBadge` pinta el badge **"DEV"** en el topbar.

### Levantar el entorno local

```bash
pnpm supabase start   # Postgres 54322 · API/REST 54321 · Studio 54323
pnpm dev              # Next en 3000
```

`supabase/config.toml` versiona la config local; `supabase/seed/` tiene los seeds de datos
de prueba.

### Migraciones de esquema (CLI de Supabase)

El esquema se versiona en `supabase/migrations/` con la CLI (`supabase`, devDependency).
Local y prod se mantienen sincronizados así:

```bash
# Crear una nueva migración tras un cambio de esquema
pnpm supabase migration new <nombre>

# Aplicarla en local (no necesita link). `db reset` está PROHIBIDO acá:
# lo frena el centinela, y el porqué está en el Motivo de esa regla
pnpm supabase migration up

# Aplicar a prod — antes, el backup y el precheck que exige el centinela
pnpm supabase link --project-ref ruedelunbtaomhrzgelc
pnpm supabase db push
```

- Auth de la CLI vía Personal Access Token (`supabase login --token`), no por browser.
- `db pull`/`db push` cubren el schema `public` (tablas, RLS, funciones), **no** usuarios
  de Auth, Storage buckets ni Edge Functions: esos se replican a mano.
- **No hay ensayo intermedio.** Sin el proyecto dev, una migración va de local directo a prod.
  El backup + precheck dejó de ser buena práctica y es la única red que queda.

## Roles de usuario

Los roles son **dinámicos**: viven en la tabla `roles` (+ `role_modules`) y el admin los crea/edita/borra desde `/admin` (tab Roles). La matriz rol→módulos ya **no** está hardcodeada.

| Rol | Tipo | Acceso |
|---|---|---|
| `admin` | sistema (`is_system`) | Total — short-circuit `is_admin()`, sin filas en `role_modules`. Único tier de control |
| `sin_asignar` | sistema (`is_system`) | Default de altas nuevas. Cero módulos (solo Home) |
| *(dinámicos)* | creados por el admin | Los módulos que el admin les asigne (`role_modules`) |

La lógica de permisos vive en `src/shared/auth/permissions/` — helpers puros **map-driven** (`getModulesForRole(map, role)`, `normalizeRole`, `moduleForPath`), ya no una matriz. Se importa por la carpeta (`@/shared/auth/permissions`), que sólo re-exporta: adentro están `modulos/` (el catálogo), `rutas/` y `roles/`. **Agregar un módulo toca cinco lugares**, listados en el encabezado de su `index.ts`. El mapa `roleModuleMap` se carga en `AppContext` desde la DB. La RLS de Postgres gatea los datos por módulo vía `has_module(slug)`; `usuarios.rol` solo se cambia por la API admin (service_role), protegido por el trigger `prevent_rol_self_change`. El middleware `middleware.ts` solo gatea la sesión (redirect login).

## Dominios corporativos autorizados

Solo se puede hacer login con estos dominios:

| Dominio | Departamento |
|---|---|
| `@eminat.net` | Marketing |
| `@emc.health` | Medical Center |
| `@vivinegretefoundation.org` | Foundation |

La validación ocurre en `src/app/login/page.tsx` antes de llamar a Supabase Auth.

## Módulos de negocio

| Módulo | Ruta | Descripción |
|---|---|---|
| Launchpad | `/` | Pantalla de inicio — muestra módulos disponibles según rol |
| Stratix 360 | `/stratix-mkt` | Tablero de marketing: actividades, KPIs, Kanban, nómina. El módulo más grande (1723 líneas) |
| Medical | `/medical` | Gestión de pacientes, citas, incidentes, capacitaciones, auditoría |
| Research | `/research` | Leads, campañas de email/SMS, pipeline, analíticas (ResearchModule.tsx, 1068 líneas) |
| Cobranzas | `/cobranzas` | Ventas mensuales, cuentas por cobrar, depósitos. Import/export CSV |
| Accounting | `/accounting` | KPIs financieros con gráficas por área (Resumen, Ventas, Por Cobrar, Bancario) |
| Directorio | `/directorio` | Listado de miembros con búsqueda y filtros por departamento |
| Reuniones | `/reuniones` | Actas de reunión: participantes, temas tratados, pendientes y acta imprimible |
| Admin | `/admin` | CRUD completo de usuarios: crear, editar, activar/desactivar, eliminar con reasignación |
| Finanzas | `/finanzas` | En construcción |
| TH/HR | `/th-hr` | En construcción |

## Marcas del grupo Eminat

Las marcas **salen de la tabla `empresas`**, que el admin administra desde `/admin` →
Organización. Se leen del contexto:

- `useApp().marcas` — las ofrecibles para una actividad nueva (`activo && recibe_actividades`)
- `useApp().colorMarca` — mapa `codigo → color` de **todas**, sin filtrar

La asimetría es deliberada: si se desactiva una empresa, sus actividades históricas tienen
que seguir pintándose con su color y contando en las gráficas; solo deja de ofrecerse para
actividades nuevas. Las derivaciones viven en `src/shared/context/empresa-derivations.ts` con
sus tests.

Las 11 filas del catálogo cubren dos relaciones distintas: **pertenencia** (dónde trabaja
una persona, `usuarios.empresa_id`) y **atribución** (a qué marca se imputa una actividad,
`actividades.empresa → empresas.codigo`). `recibe_actividades` distingue cuáles reciben lo
segundo; hoy son 7:

- **EMC** — Eminat Medical Center (`@emc.health`)
- **SVN** — Servi-Net
- **ERG** — Eminat Research Group
- **VNF** — Viviné Grette Foundation (`@vivinegretefoundation.org`)
- **PREMIER** — Premier
- **ORNELLA** — Ornella
- **Eminat Mentor**

Quién pide una actividad sale de `actividades.solicitante_id`, una FK a `usuarios` — el
dropdown ofrece a todos los usuarios activos. La constante `SOLICITANTES` que vivía
hardcodeada en `src/shared/constants/domain.ts` ya no existe: sus valores eran
`responsable_ref`, y ese campo se eliminó en la fase 2 (ver
`docs/superpowers/specs/2026-08-11-responsable-ref-design.md`).

## Estructura clave del código

**Todo el código de la app vive en `src/`**: es lo que compila el bundler. Lo que está fuera de
`src/` no es la app — es el repo: `supabase/` (la CLI lo busca en la raíz), `e2e/` (Playwright),
`public/` (Next lo sirve desde la raíz), `docs/` y los archivos de config.

El código transversal vive en `src/shared/` y cada módulo de negocio en `src/features/<modulo>/`.
Las páginas de `src/app/` son thin routes que montan el feature.

```
src/
  middleware.ts        ← gate de sesión en el Edge (redirect a /login)
  shared/
    auth/permissions/  ← catálogo de módulos, rutas y roles (map-driven, roles dinámicos)
    context/           ← AppContext: usuario autenticado, actividades, catálogos
    db/
      env.client.ts    ← schema zod de las vars públicas + isProdDb/isDevDb
      env.server.ts    ← vars solo-servidor (service_role, Resend)
      supabase.ts      ← singleton del cliente Supabase (browser)
      supabaseAdmin.ts ← cliente service_role (solo rutas API)
      requireAdmin.ts  ← guard de las rutas API de admin
      requireAccess.ts ← guard de sesión/módulo del resto de las rutas API
    constants/domain.ts← marcas, meses/trimestres, columnas de Kanban, colores
    components/        ← UI compartida (AppShell, Sidebar, Topbar, dashboard/)
    hooks/             ← hooks transversales (useUserPreference, usePersistedState, useClock)
    utils/             ← funciones puras (api, canonical, dates, delimited, filters, html)
    motion/index.tsx   ← componentes de animación reutilizables (Framer Motion)
    i18n/              ← claves es.json / en.json + useT()
  features/            ← un directorio por módulo de negocio
    accounting/  admin/  cobranzas/  directorio/
    medical/     overview/  research/  reuniones/  stratix-mkt/
  app/
    layout.tsx         ← layout raíz (fuentes Syne + DM Mono)
    (app)/             ← grupo de rutas protegidas
      layout.tsx       ← envuelve con AppProvider
      page.tsx         ← Launchpad
      admin/ stratix-mkt/ medical/ research/ cobranzas/ accounting/
    api/
      admin/           ← CRUD de usuarios (create, delete, reassign-and-delete, reset-password, update)
      mail/            ← envío de correo (send via Resend, con guard de módulo)
supabase/
  config.toml          ← config del stack local
  migrations/  seed/  rollback/
```

## Flujo de autenticación

1. Usuario ingresa email → validación de dominio corporativo en cliente
2. Supabase Auth maneja la sesión con cookies SSR (`@supabase/ssr`)
3. `middleware.ts` verifica el JWT en cada request para proteger rutas
4. `AppContext.tsx` carga el perfil del usuario y sus actividades al montar

## Convenciones

Las administra el centinela: son órdenes sobre cómo escribir, no descripción del proyecto, así que
no viven acá. Cubren thin routes, `route.ts` solo handlers, `src/shared/motion`, permisos por
módulo, el singleton de Supabase, i18n sin `i18n-ignore`, el ban de `any`, el naming de FK y los
datos de prueba por el frontend. Ver «Reglas de código» al final.

## Grafo de conocimiento

El proyecto tiene un grafo de conocimiento interactivo generado con `understand-anything`.
Para explorarlo: `/understand-dashboard`

## Protocolo de memoria (engram)

Después de cualquier compactación, antes de retomar cualquier tarea o skill en ejecución:

1. `mem_session_summary` — guardar el contenido del resumen compactado con `project: 'eminat-app'`
2. `mem_context` — recuperar el historial reciente con `project: 'eminat-app'`

Esto tiene prioridad sobre cualquier skill en ejecución. Sin estos dos pasos, el estado de la sesión anterior se pierde.

Durante la sesión, llamar `mem_save` después de cada decisión de arquitectura, bug fix, convención establecida o descubrimiento relevante — no esperar a que el usuario lo pida.

## Reglas de código

Las reglas sobre **cómo escribir código acá** las administra el **centinela**, que las carga solo y
las hace cumplir antes de cada edición. No se listan ni se referencian por ruta desde este archivo:
dónde viven es asunto del plugin.

Este archivo describe cómo ES el proyecto; las reglas dicen cómo se trabaja. Ante una
contradicción, gana la regla y hay que corregir este archivo.

- `centinela --cajones` — qué cajones rigen acá y cuántos checks trae cada uno.
- `centinela --auditoria "<título>"` — cuántos archivos incumplen una regla hoy.
- Para agregar una: la skill `regla-nueva`, que pregunta el cajón — lo único que no se deduce.

Cuando una regla frena una edición, el mensaje trae su **Motivo**. Ese texto es la regla, no un
código de error: se arregla el contenido, no se esquiva el check.
