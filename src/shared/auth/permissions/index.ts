// Fuente única de "qué módulos ve cada rol". La usan el launchpad, el AppShell, el middleware,
// el panel de admin y los guards de las rutas API — 29 archivos importan de acá.
//
// Este archivo SÓLO re-exporta (rules/codigo.md: un index de carpeta que agrupa no define nada).
// Lo que hay adentro:
//
//   modulos/  el catálogo — MODULE, MODULE_META, ALL_MODULES
//   rutas/    de pathname a módulo y al revés
//   roles/    normalización y el mapa rol → módulos
//
// **Para agregar un módulo hay que tocar CINCO lugares**, y este comentario los lista porque
// hasta el 29/08/2026 nombraba dos y los otros tres se descubrían fallando:
//
//   1. `modulos/slugs.ts`      — el slug
//   2. `modulos/index.ts`      — su entrada en MODULE_META
//   3. `src/app/(app)/<slug>/` — la carpeta de la ruta
//   4. `shell/appShellConfig.ts` — el ítem del rail y el título del topbar
//   5. `src/shared/i18n/locales/es.json` y `en.json` — sus claves
//
// Y en la base: una fila en `role_modules`, o el módulo existe para la app y no para la RLS.

export { MODULE, MODULE_META, ALL_MODULES, isModuleSlug } from './modulos'
export type { ModuleSlug, ModuleMeta, AreaLeader, SubArea } from './modulos'

export { modulePath, ROUTES, moduleForPath } from './rutas'

export { ADMIN_ROLE, DEFAULT_ROLE, normalizeRole, getModulesForRole } from './roles'
export type { Role, RoleModuleMap, RoleRow } from './roles'
