// Barrel de los hooks de Stratix. SOLO re-exporta: no define ni compone nada — quien los usa
// es `StratixProvider`, que es el componente que necesita las cinco piezas juntas.
// Cada hook vive en su carpeta y se lee solo.
export { useTablero } from './useTablero'
export { useKanban } from './useKanban'
export { useSolicitudes } from './useSolicitudes'
export { useActividadForm } from './useActividadForm'
export { useReporte } from './useReporte'
