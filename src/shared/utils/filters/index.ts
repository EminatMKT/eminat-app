// El motor de filtros declarativo, agrupado: los defs y el predicado en `defs`, los valores por
// defecto en `defaults`. Este archivo sólo re-exporta.
export { applyFilters, distinctValues, distinctTokens } from './defs'
export type { FilterDef, FilterKind, FilterValues } from './defs'
export { defaultFilterValues, resolveFilterValues } from './defaults'
