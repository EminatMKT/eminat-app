import type { FilterDef, FilterValues } from '../defs'

// Los defaults declarados, como un FilterValues. Es el estado inicial y también a lo que
// vuelve el clear.
export function defaultFilterValues<T>(defs: FilterDef<T>[]): FilterValues {
  const out: FilterValues = {}
  for (const d of defs) if (d.defaultValue) out[d.key] = d.defaultValue
  return out
}

// Los valores efectivos: lo guardado gana, y lo que nunca se tocó toma su default.
//
// La distinción entre «vacío» y «sin tocar» es todo el punto. Un filtro puesto en «Todos»
// guarda la cadena vacía, que NO es lo mismo que la clave ausente: sin esta diferencia, quitar
// un filtro y recargar la página darían resultados distintos —el default volvería solo— y no
// habría forma de ver el tablero completo.
export function resolveFilterValues<T>(defs: FilterDef<T>[], guardados: FilterValues): FilterValues {
  return { ...defaultFilterValues(defs), ...guardados }
}
