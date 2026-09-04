// Motor de filtros declarativo y reutilizable. Cada filtro se define una vez (key, opciones,
// match) y de ahí salen la UI (FilterBar), el predicado y el clear. Agregar un filtro = un def.
// Las formas viven en `../types`.
import type { FilterDef, FilterValues } from '../types'

// Aplica todos los filtros activos (valor no vacío) en AND. Puro y testeable.
export function applyFilters<T>(items: T[], defs: FilterDef<T>[], values: FilterValues): T[] {
  return items.filter(item => defs.every(d => { const v = values[d.key]; return !v || d.match(item, v) }))
}

// Los defs que se muestran. Recibe lo OCULTO y no lo visible a propósito: guardar la excepción y
// no la regla es lo que hace que la lista pueda crecer. Con una lista de «visibles», un filtro
// agregado por el código mañana nacería invisible para todo el que tenga una vista guardada de
// antes, y nadie entendería por qué le falta.
//
// Lo que sale de acá es lo que se le pasa a `applyFilters`, no sólo lo que se dibuja: un filtro
// escondido DEJA DE FILTRAR. Si siguiera aplicándose, el tablero mostraría 40 de 267 tareas sin
// un solo control en pantalla que lo explique — que es justo lo que el chip de «N activos»
// existe para evitar. El valor no se borra al esconder: queda en `valores` y vuelve intacto al
// mostrarlo de nuevo.
export const visibleDefs = <T,>(defs: FilterDef<T>[], ocultos: string[]): FilterDef<T>[] =>
  defs.filter(d => !ocultos.includes(d.key))

// Valores distintos presentes en los datos para una columna (reutiliza la data como opciones).
export const distinctValues = <T,>(items: T[], get: (i: T) => unknown): string[] =>
  Array.from(new Set(items.map(get).filter(Boolean).map(String))).sort()

// Igual que distinctValues pero para columnas multivalor separadas por coma (ej. países).
export const distinctTokens = <T,>(items: T[], get: (i: T) => unknown): string[] =>
  Array.from(new Set(items.flatMap(i => String(get(i) ?? '').split(',').map(s => s.trim()).filter(Boolean)))).sort()
