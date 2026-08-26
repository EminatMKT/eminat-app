// Motor de filtros declarativo y reutilizable. Cada filtro se define una vez (key, opciones,
// match) y de ahí salen la UI (FilterBar), el predicado y el clear. Agregar un filtro = un def.

export interface FilterDef<T> {
  key: string
  labelKey: string // clave i18n del placeholder "Todos …" (la traduce el caller)
  kind?: 'select' | 'text' | 'date' // control a renderizar; default 'select'
  options?: (items: T[]) => string[] // solo para 'select': valores elegibles (de los datos o de un dominio)
  // Cómo se MUESTRA cada opción, cuando el valor guardado no se puede leer: un uuid de
  // responsable, o un estado cuyo canónico está en español y la app puede estar en inglés
  // (ver rules/codigo.md, "el valor canónico NO es la etiqueta"). Sin esto, el
  // desplegable rotula con el dato crudo. Default: el valor mismo.
  optionLabel?: (value: string) => string
  match: (item: T, value: string) => boolean // ¿el item pasa este filtro para ese valor?
}

export type FilterValues = Record<string, string>

// Aplica todos los filtros activos (valor no vacío) en AND. Puro y testeable.
export function applyFilters<T>(items: T[], defs: FilterDef<T>[], values: FilterValues): T[] {
  return items.filter(item => defs.every(d => { const v = values[d.key]; return !v || d.match(item, v) }))
}

// Valores distintos presentes en los datos para una columna (reutiliza la data como opciones).
export const distinctValues = <T,>(items: T[], get: (i: T) => unknown): string[] =>
  Array.from(new Set(items.map(get).filter(Boolean).map(String))).sort()

// Igual que distinctValues pero para columnas multivalor separadas por coma (ej. países).
export const distinctTokens = <T,>(items: T[], get: (i: T) => unknown): string[] =>
  Array.from(new Set(items.flatMap(i => String(get(i) ?? '').split(',').map(s => s.trim()).filter(Boolean)))).sort()
