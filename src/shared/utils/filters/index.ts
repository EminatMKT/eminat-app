// El motor de filtros declarativo, agrupado: las formas en `types`, el predicado y los defs
// visibles en `defs`, los valores por defecto en `defaults`, la comparación en `compare`, el
// rango de fechas en `range`. Este archivo sólo re-exporta.
export type { FilterDef, FilterKind, FilterValues } from './types'
export { applyFilters, countByOption, distinctValues, distinctTokens, visibleDefs } from './defs'
export { defaultFilterValues, resolveFilterValues } from './defaults'
export { sameFilters } from './compare'
export { default as enRango } from './range'
export { default as monthRange } from './range/month'
export { RANGE_SEP } from './range/constants'
