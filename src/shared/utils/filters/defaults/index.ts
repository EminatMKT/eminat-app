import type { FilterDef, FilterValues } from '../types'

// Los defaults declarados, como un FilterValues. Es el estado inicial y también a lo que
// vuelve el clear.
export function defaultFilterValues<T>(defs: FilterDef<T>[]): FilterValues {
  const out: FilterValues = {}
  for (const d of defs) if (d.defaultValue) out[d.key] = d.defaultValue
  return out
}

// Los valores efectivos, en tres capas: lo que trae el código, lo que la persona guardó como su
// vista de apertura, y lo que tocó en esta sesión. Gana la de más a la derecha.
//
// La distinción entre «vacío» y «sin tocar» es todo el punto, y por eso `guardados` va último. Un
// filtro puesto en «Todos» guarda la cadena vacía, que NO es lo mismo que la clave ausente: sin
// esta diferencia, quitar un filtro y recargar la página darían resultados distintos —el default
// o la vista volverían solos— y no habría forma de ver el tablero completo.
//
// `vista` sólo pesa en la primera carga: elegir una vista del desplegable escribe sus valores en
// `guardados`, así que a partir de ahí las dos capas dicen lo mismo.
export function resolveFilterValues<T>(defs: FilterDef<T>[], guardados: FilterValues, vista?: FilterValues): FilterValues {
  return { ...defaultFilterValues(defs), ...vista, ...guardados }
}
