import type { VistaFiltro } from '@/shared/data'

/** Todo lo que `FilterPresets` necesita de `useFilters`: las vistas, cuál está puesta, si lo de
 *  pantalla ya no coincide, y las seis cosas que se pueden hacer con ellas. */
export type PresetsProps = {
  vistas: VistaFiltro[]
  activaId: string
  modificada: boolean
  onAplicar: (id: string) => void
  onGuardar: (nombre: string) => Promise<void>
  onActualizar: (id: string) => Promise<void>
  onRenombrar: (id: string, nombre: string) => Promise<void>
  onBorrar: (id: string) => Promise<void>
  onMarcar: (id: string) => Promise<void>
}
