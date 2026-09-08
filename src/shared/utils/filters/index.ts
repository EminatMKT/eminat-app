// El motor de filtros declarativo, agrupado: las formas en `types`, el predicado y los defs
// visibles en `defs`, los valores por defecto en `defaults`, la comparación en `compare`. Este
// archivo sólo re-exporta.
export type { FilterDef, FilterKind, FilterValues } from './types'
export { applyFilters, countByOption, distinctValues, distinctTokens, visibleDefs } from './defs'
export { defaultFilterValues, resolveFilterValues } from './defaults'
export { sameFilters } from './compare'
