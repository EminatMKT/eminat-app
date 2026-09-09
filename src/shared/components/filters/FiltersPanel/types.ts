import type { Filtros } from '@/shared/hooks'

/** Lo que el módulo le pasa al panel: el contrato entero de `useFilters`, los items sin filtrar
 *  —de ahí salen las opciones de cada desplegable— y con qué clave recuerda si quedó recogido. */
export type FiltersPanelProps<T> = {
  filtros: Filtros<T>
  items: T[]
  persistKey: string
}
