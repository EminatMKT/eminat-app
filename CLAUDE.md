# Eminat App — Contexto del proyecto

Sistema operativo interno de Eminat Group. Plataforma de gestión empresarial desarrollada con Next.js 14 + Supabase. Desplegada en Vercel en `eminat.app`.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion
- **Backend/DB:** Supabase (PostgreSQL + Auth + Realtime)
- **Email:** Resend (con `@react-email/components`)
- **Deploy:** Vercel

## Entornos y base de datos

Hay **dos proyectos Supabase independientes**, con datos totalmente aislados:

| Entorno | Proyecto | Ref | Dónde se configuran las vars |
|---|---|---|---|
| **Producción** | `eminat-app` (org Pro) | `ruedelunbtaomhrzgelc` | Vercel → Environment Variables (scope Production), `APP_ENV=vercel` |
| **Desarrollo** | `eminat-app-dev` (org free) | `ydcadspinryybextlvyi` | `.env.local` (gitignored), `APP_ENV=development` |

- En local **siempre** se apunta a dev. `lib/env.client.ts` exporta `isProdDb`/`isDevDb`
  y un `superRefine` que **rompe el build** si `APP_ENV=development` apunta al ref de prod.
- `AppShell.tsx` muestra un badge **"DEV"** en el topbar cuando `isDevDb` es true.

### Migraciones de esquema (CLI de Supabase)

El esquema se versiona en `supabase/migrations/` con la CLI (`supabase`, devDependency).
Dev y prod se mantienen sincronizados así:

```bash
# Crear una nueva migración tras un cambio de esquema
pnpm supabase migration new <nombre>

# Aplicar al proyecto linkeado (cambiar de proyecto con `link`)
pnpm supabase link --project-ref ydcadspinryybextlvyi   # dev
pnpm supabase db push
pnpm supabase link --project-ref ruedelunbtaomhrzgelc    # prod
pnpm supabase db push
```

- Auth de la CLI vía Personal Access Token (`supabase login --token`), no por browser.
- `db pull`/`db push` cubren el schema `public` (tablas, RLS, funciones), **no** usuarios
  de Auth, Storage buckets ni Edge Functions: esos se replican aparte en dev.

## Roles de usuario

| Rol | Descripción | Acceso |
|---|---|---|
| `superadmin` | Control total. Único: Freddy Crespín | Todos los módulos + Admin |
| `colaborador` (Tipo A) | Empleados permanentes | Módulos según área |
| `pasante` (Tipo B) | Pasantes | Módulos restringidos |

La lógica de permisos vive en `lib/permissions.ts` — es el archivo con mayor fan-in del proyecto. El middleware `middleware.ts` lo consume para proteger rutas en el Edge antes de que lleguen al cliente.

## Dominios corporativos autorizados

Solo se puede hacer login con estos dominios:

| Dominio | Departamento |
|---|---|
| `@eminat.net` | Marketing |
| `@emc.health` | Medical Center |
| `@vivinegretefoundation.org` | Foundation |

La validación ocurre en `app/login/page.tsx` antes de llamar a Supabase Auth.

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
| Admin | `/admin` | CRUD completo de usuarios: crear, editar, activar/desactivar, eliminar con reasignación |
| Finanzas | `/finanzas` | En construcción |
| TH/HR | `/th-hr` | En construcción |

## Marcas del grupo Eminat

Las constantes de marcas y empresas viven en `lib/companies.ts` y `lib/AppContext.tsx`:

- **EMC** — Eminat Medical Center (`@emc.health`)
- **SVN** — Servi-Net
- **ERG** — Eminat Research Group
- **VNF** — Viviné Grette Foundation (`@vivinegretefoundation.org`)
- **PREMIER** — Premier
- **ORNELLA** — Ornella
- **Eminat Mentor**

## Estructura clave del código

```
middleware.ts          ← protección de rutas (Edge, consume lib/permissions.ts)
lib/
  permissions.ts       ← matriz de roles/módulos. Importado por casi todo.
  AppContext.tsx        ← contexto global: usuario autenticado, actividades, constantes de dominio
  supabase.ts          ← singleton del cliente Supabase (browser)
  companies.ts         ← constantes de marcas y utilidades
  motion.tsx           ← componentes de animación reutilizables (Framer Motion)
app/
  layout.tsx           ← layout raíz (fuentes Syne + DM Mono)
  (app)/               ← grupo de rutas protegidas
    layout.tsx         ← envuelve con AppProvider
    page.tsx           ← Launchpad
    admin/             ← panel de administración de usuarios
    stratix-mkt/       ← módulo Stratix 360
    medical/           ← módulo médico
    research/          ← módulo de investigación
    cobranzas/         ← módulo de cobranzas
    accounting/        ← módulo de contabilidad
  api/
    admin/             ← CRUD de usuarios (create, delete, reassign-and-delete, reset-password, update)
    mail/              ← envío de emails (send via Resend, campaigns CRUD)
  components/
    AppShell.tsx       ← shell de navegación con sidebar + topbar + modo oscuro
    ResearchModule.tsx ← módulo de investigación (componente autónomo, muy grande)
    NavBar.tsx         ← barra de navegación lateral
    Onboarding.tsx     ← flujo de onboarding con spotlight animado
```

## Flujo de autenticación

1. Usuario ingresa email → validación de dominio corporativo en cliente
2. Supabase Auth maneja la sesión con cookies SSR (`@supabase/ssr`)
3. `middleware.ts` verifica el JWT en cada request para proteger rutas
4. `AppContext.tsx` carga el perfil del usuario y sus actividades al montar

## Convenciones

- Páginas de módulos: exportan un único componente default (ej. `AccountingPage`)
- Rutas API: usan `export async function POST/GET/PUT/DELETE` de Next.js App Router
- Animaciones: siempre usar los componentes de `lib/motion.tsx`, no Framer Motion directo
- Permisos: verificar con `canAccess(role, module)` de `lib/permissions.ts`
- Supabase en cliente: importar el singleton de `lib/supabase.ts`
- Nombres de columnas FK: `<entidad>_id` cuando la FK apunta a una **clave surrogate** (uuid),
  ej. `departamento_id`. **Nombre natural** (sin `_id`) cuando apunta a una **clave natural
  legible**, ej. `usuarios.rol` → `roles.key` (el valor ES el slug del rol, no un id oculto;
  `rol_id` sería engañoso). El sufijo `_id` implica surrogate; no usarlo para claves naturales.

## Grafo de conocimiento

El proyecto tiene un grafo de conocimiento interactivo generado con `understand-anything`.
Para explorarlo: `/understand-dashboard`

## Protocolo de memoria (engram)

Después de cualquier compactación, antes de retomar cualquier tarea o skill en ejecución:

1. `mem_session_summary` — guardar el contenido del resumen compactado con `project: 'eminat-app'`
2. `mem_context` — recuperar el historial reciente con `project: 'eminat-app'`

Esto tiene prioridad sobre cualquier skill en ejecución. Sin estos dos pasos, el estado de la sesión anterior se pierde.

Durante la sesión, llamar `mem_save` después de cada decisión de arquitectura, bug fix, convención establecida o descubrimiento relevante — no esperar a que el usuario lo pida.
