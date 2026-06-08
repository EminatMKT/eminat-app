// Single source of truth for role → module access.
// Used by: launchpad (which cards to render), AppShell (sidebar gating),
// middleware (server-side route protection), admin panel (role dropdown).
//
// To add a new role: add the entry to PERMISSIONS, optionally to ROLE_LABELS.
// To add a new module: add the slug here and to MODULE_META, then create the
// route folder under app/(app)/<slug>.

export type Role =
  | 'admin'
  | 'stratix360'
  | 'finanzas'
  | 'contabilidad_rrhh'
  | 'medico'
  | 'investigacion'
  | 'medico_investigacion'

export type ModuleSlug =
  | 'stratix-mkt'
  | 'cobranzas'
  | 'research'
  | 'medical'
  | 'accounting'
  | 'th-hr'
  | 'directorio'
  | 'admin'

export const ROLES: Role[] = [
  'admin',
  'stratix360',
  'finanzas',
  'contabilidad_rrhh',
  'medico',
  'investigacion',
  'medico_investigacion',
]

export const ALL_MODULES: ModuleSlug[] = [
  'stratix-mkt',
  'cobranzas',
  'research',
  'medical',
  'accounting',
  'th-hr',
  'directorio',
  'admin',
]

export const PERMISSIONS: Record<Role, ModuleSlug[]> = {
  admin: [...ALL_MODULES],
  stratix360: ['stratix-mkt', 'directorio'],
  finanzas: ['cobranzas', 'accounting', 'directorio'],
  contabilidad_rrhh: ['accounting', 'th-hr', 'directorio'],
  medico: ['medical', 'directorio'],
  investigacion: ['research', 'directorio'],
  medico_investigacion: ['medical', 'research', 'directorio'],
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  stratix360: 'Stratix 360',
  finanzas: 'Finanzas',
  contabilidad_rrhh: 'Contabilidad / RRHH',
  medico: 'Médico',
  investigacion: 'Investigación',
  medico_investigacion: 'Médico + Investigación',
}

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
    leader: { name: 'Freddy Crespín', title: 'Director General' },
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

// Map module slug → URL prefix used to match against pathname in middleware
// and elsewhere. Most are 1:1 with their slug; explicit to keep search obvious.
export const MODULE_PATH_PREFIX: Record<ModuleSlug, string> = {
  'stratix-mkt': '/stratix-mkt',
  cobranzas: '/cobranzas',
  research: '/research',
  medical: '/medical',
  accounting: '/accounting',
  'th-hr': '/th-hr',
  directorio: '/directorio',
  admin: '/admin',
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as string[]).includes(value)
}

// Compatibility shim. Old role values (`pasante`, `colaborador`, `coordinador`,
// `superadmin`) might still appear in usuarios.rol until the DB migration runs.
// This bridges them to the new model so the launchpad never renders empty
// and the sidebar still works during the deploy window.
//
// Remove this shim in a follow-up PR once the DB UPDATE statements have run.
const LEGACY_TO_NEW: Record<string, Role> = {
  superadmin: 'admin',
  coordinador: 'admin',
  colaborador: 'stratix360',
  pasante: 'stratix360',
}

export function normalizeRole(rawRole: unknown): Role | null {
  if (typeof rawRole !== 'string') return null
  if (isRole(rawRole)) return rawRole
  if (rawRole in LEGACY_TO_NEW) return LEGACY_TO_NEW[rawRole]
  return null
}

export function getModulesForRole(role: Role | null): ModuleSlug[] {
  if (!role) return []
  return PERMISSIONS[role] ?? []
}

export function canAccess(role: Role | null, module: ModuleSlug): boolean {
  if (!role) return false
  return getModulesForRole(role).includes(module)
}

// Given a request pathname, return the ModuleSlug it belongs to (or null if
// it's a path that doesn't map to a permission-gated module — e.g. /, /login,
// /api, /reset-password). Order matters: longest prefix first.
//
// Special-case routes:
//   /overview is the admin-only "Ver todo" launchpad view. It piggybacks on
//   the 'admin' permission so only admins can reach it.
export function moduleForPath(pathname: string): ModuleSlug | null {
  if (pathname === '/overview' || pathname.startsWith('/overview/')) return 'admin'
  const entries = (Object.entries(MODULE_PATH_PREFIX) as [ModuleSlug, string][])
    .sort((a, b) => b[1].length - a[1].length)
  for (const [slug, prefix] of entries) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return slug
  }
  return null
}
