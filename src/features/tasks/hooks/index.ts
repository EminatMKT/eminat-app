// Barrel de los hooks del módulo. SOLO re-exporta: no define ni compone nada — quien los usa
// es `TasksProvider`, que es el componente que necesita las cinco piezas juntas.
// Cada hook vive en su carpeta y se lee solo.
//
// Re-exportación NOMBRADA, no `export *`: es la forma que Next 14 resuelve sin arrastrar los
// vecinos al grafo de módulos.
export { useTablero } from './useTablero'
export { useKanban } from './useKanban'
export { useSolicitudes } from './useSolicitudes'
export { useActividadForm } from './useActividadForm'
export { useReporte } from './useReporte'
