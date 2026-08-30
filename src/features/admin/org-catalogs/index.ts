// Barrel: sólo re-exporta. El archivo suelto tocó las 150 líneas —el techo duro, donde no vale
// marca— así que se partió en carpeta: la tabla de catálogos, sus tipos y sus helpers. La ruta
// de import (`@/features/admin/org-catalogs`) resuelve acá y ningún consumidor se tocó.
export type { OrgCat, OrgField, CatalogDef } from './types'
export { ORG_CATALOGS, ORG_CATS, isOrgCat } from './catalogo'
export { codigoFrom, pickFields, dupError, cargoIdsOf, cargoNamesOf } from './utils'
