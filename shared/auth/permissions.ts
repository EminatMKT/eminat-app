// Single source of truth for role → module access.
// Used by: launchpad (which cards to render), AppShell (sidebar gating),
// middleware (server-side route protection), admin panel (role dropdown).
//
// Roles are now dynamic (DB-driven). The role → module mapping lives in the
// DB and is passed into the pure helpers below as a RoleModuleMap.
// To add a new module: add the slug here and to MODULE_META, then create the
// route folder under app/(app)/<slug>.

export type Role = string

export type ModuleSlug =
  | 'stratix-mkt'
  | 'cobranzas'
  | 'research'
  | 'medical'
  | 'accounting'
  | 'th-hr'
  | 'directorio'
  | 'admin'

export type RoleModuleMap = Record<string, ModuleSlug[]>
export type RoleRow = { key: string; label: string; is_system: boolean }

export const ADMIN_ROLE = 'admin'
export const DEFAULT_ROLE = 'sin_asignar'

export type AreaLeader = { name: string; title: string }
export type SubArea = { name: string; leader: string }

type ModuleMeta = {
  slug: ModuleSlug
  name: string
  href: string
  description: string
  iconKey: ModuleSlug
  // null = "titular por asignar" placeholder rendered on the launchpad
  leader: AreaLeader | null
  // optional list of sub-areas with their leaders (rendered as small text)
  subAreas?: SubArea[]
}

export const MODULE_META: Record<ModuleSlug, ModuleMeta> = {
  'stratix-mkt': {
    slug: 'stratix-mkt',
    name: 'Stratix 360',
    href: '/stratix-mkt',
    description: 'Marketing, producción y campañas de Eminat Group.',
    iconKey: 'stratix-mkt',
    leader: { name: 'Freddy Crespín', title: 'Director de Marketing' },
    subAreas: [
      { name: 'Diseño', leader: 'Joselyne Guerrero' },
      { name: 'Edición', leader: 'David Falconi' },
      { name: 'Automatización · Data & Insight', leader: 'Wagner Dueñas' },
      { name: 'Cuentas / CM', leader: 'Naomi Panchana' },
    ],
  },
  cobranzas: {
    slug: 'cobranzas',
    name: 'Cobranzas',
    href: '/cobranzas',
    description: 'Facturación, cobros y conciliación.',
    iconKey: 'cobranzas',
    leader: null,
  },
  research: {
    slug: 'research',
    name: 'Investigación',
    href: '/research',
    description: 'Operaciones de investigación clínica y leads.',
    iconKey: 'research',
    leader: null,
  },
  medical: {
    slug: 'medical',
    name: 'Médico',
    href: '/medical',
    description: 'Pacientes, citas y workflows clínicos.',
    iconKey: 'medical',
    leader: null,
  },
  accounting: {
    slug: 'accounting',
    name: 'Contabilidad',
    href: '/accounting',
    description: 'Libros, impuestos y reportes financieros.',
    iconKey: 'accounting',
    leader: null,
  },
  'th-hr': {
    slug: 'th-hr',
    name: 'Talento Humano',
    href: '/th-hr',
    description: 'Personas, nómina y desempeño.',
    iconKey: 'th-hr',
    leader: null,
  },
  directorio: {
    slug: 'directorio',
    name: 'Directorio',
    href: '/directorio',
    description: 'Todo el equipo de Eminat Group en un lugar.',
    iconKey: 'directorio',
    leader: null,
  },
  admin: {
    slug: 'admin',
    name: 'Administración',
    href: '/admin',
    description: 'Usuarios, roles y configuración del sistema.',
    iconKey: 'admin',
    leader: null,
  },
}

// ALL_MODULES se DERIVA de MODULE_META (no más lista a mano; agregar un módulo =
// una entrada en MODULE_META). Declarado DESPUÉS de MODULE_META (lo referencia).
export const ALL_MODULES = Object.keys(MODULE_META) as ModuleSlug[]

export function isModuleSlug(value: unknown): value is ModuleSlug {
  return typeof value === 'string' && value in MODULE_META
}

// ── Rutas (fuente única) ───────────────────────────────────────────────────
// Ruta de un módulo = '/' + slug (convención del App Router, = MODULE_META.href).
// modulePath() la centraliza con type-safety: un slug inexistente es error de tsc.
export function modulePath(slug: ModuleSlug): string {
  return `/${slug}`
}
// Rutas que NO son módulos.
export const ROUTES = {
  home: '/',
  login: '/login',
  resetPassword: '/reset-password',
  overview: '/overview',
} as const

// Compatibility shim. Old role values (`pasante`, `colaborador`, `coordinador`,
// `superadmin`) might still appear in usuarios.rol until the DB migration runs.
const LEGACY_TO_NEW: Record<string, Role> = {
  superadmin: 'admin', coordinador: 'admin', colaborador: 'stratix360', pasante: 'stratix360',
}

export function normalizeRole(raw: unknown): Role | null {
  if (typeof raw !== 'string' || !raw) return null
  return LEGACY_TO_NEW[raw] ?? raw
}

export function getModulesForRole(map: RoleModuleMap, role: Role | null): ModuleSlug[] {
  if (!role) return []
  if (role === ADMIN_ROLE) return [...ALL_MODULES]  // short-circuit: admin ve todo
  return map[role] ?? []
}
// (sin canAccess: los consumidores usan `getModulesForRole(map, role).includes(slug)`)

// Given a request pathname, return the ModuleSlug it belongs to (or null if
// it's a path that doesn't map to a permission-gated module — e.g. /, /login,
// /api, /reset-password). Order matters: longest prefix first.
//
// Special-case routes:
//   /overview is the admin-only "Ver todo" launchpad view. It piggybacks on
//   the 'admin' permission so only admins can reach it.
export function moduleForPath(pathname: string): ModuleSlug | null {
  if (pathname === '/overview' || pathname.startsWith('/overview/')) return 'admin'
  const entries = ALL_MODULES.map((slug) => [slug, '/' + slug] as const)
    .sort((a, b) => b[1].length - a[1].length)
  for (const [slug, prefix] of entries) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return slug
  }
  return null
}
