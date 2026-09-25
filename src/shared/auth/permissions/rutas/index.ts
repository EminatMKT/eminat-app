import { ALL_MODULES, MODULE, type ModuleSlug } from '../modulos'

// A module whose public path is not its stored slug. `cobranzas` stays the permission value so
// existing grants keep working; only the URL moved.
const MODULE_PATH_OVERRIDES: Partial<Record<ModuleSlug, string>> = {
  [MODULE.COBRANZAS]: '/billing',
}

// La ruta de un módulo es '/' + slug (convención del App Router). `modulePath()` la centraliza
// con type-safety: un slug inexistente es error de tsc, no un 404 en runtime.
export function modulePath(slug: ModuleSlug): string {
  return MODULE_PATH_OVERRIDES[slug] ?? `/${slug}`
}

// Rutas que NO son módulos.
export const ROUTES = {
  home: '/',
  login: '/login',
  resetPassword: '/reset-password',
  overview: '/overview',
} as const

// A qué módulo pertenece un pathname, o null si es una ruta que no está gateada por permisos
// (`/`, `/login`, `/api`, `/reset-password`).
//
// El orden importa: prefijo más largo primero, o `/th-hr` nunca ganaría contra un `/th` hipotético.
//
// Caso especial: `/overview` es la vista "Ver todo" del launchpad y se monta sobre el permiso
// 'admin', así que sólo un admin llega.
export function moduleForPath(pathname: string): ModuleSlug | null {
  if (pathname === ROUTES.overview || pathname.startsWith(ROUTES.overview + '/')) return 'admin'
  const entries = ALL_MODULES.map((slug) => [slug, modulePath(slug)] as const)
    .sort((a, b) => b[1].length - a[1].length)
  for (const [slug, prefix] of entries) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return slug
  }
  return null
}
