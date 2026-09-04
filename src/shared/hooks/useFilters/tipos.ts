import type { FilterDef, FilterValues } from '@/shared/utils'
import type { VistaFiltro } from '@/shared/data'

// El contrato de `useFilters`, escrito y no inferido. Se escribe por dos razones: es lo que
// `FiltersPanel` recibe por props —y `ReturnType<typeof useFilters<T>>` no es sintaxis válida
// para una función genérica—, y porque un contrato de trece campos merece leerse de un vistazo
// en vez de reconstruirse siguiendo el `return` de un hook.
export type Filtros<T> = {
  defs: FilterDef<T>[]      // la lista completa, para el menú de qué filtros ver
  visibles: FilterDef<T>[]  // los que se dibujan y los que filtran
  valores: FilterValues
  ocultos: string[]
  vistas: VistaFiltro[]
  activos: number
  // Cuál está aplicada y si la tocaste encima. Las dos hacen falta para que el desplegable no
  // mienta: sin `vistaActivaId` no sabe qué mostrar seleccionado después de un F5, y sin
  // `modificada` diría «Mi trimestre» mientras en pantalla hay otra cosa.
  vistaActivaId: string
  modificada: boolean
  setValor: (key: string, value: string) => void
  limpiar: () => void
  alternarVisible: (key: string) => void
  aplicarVista: (id: string) => void
  guardarVista: (nombre: string) => Promise<void>
  // Pisa una vista existente con lo que hay en pantalla. Sin esto, conservar un retoque obliga a
  // borrar la vista y volver a guardarla con el mismo nombre.
  actualizarVista: (id: string) => Promise<void>
  borrarVista: (id: string) => Promise<void>
  marcarPorDefecto: (id: string) => Promise<void>
}
