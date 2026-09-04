// Barrel: sólo re-exporta. `marcarPorDefecto` vive en su propio archivo porque es lo único acá
// con un orden que puede estar mal — dos sentencias que el índice parcial obliga a hacer en ese
// orden y no en el otro.
export { list, create, update, remove } from './vistas'
export type { VistaFiltro } from './vistas'
export { marcarPorDefecto } from './por-defecto'
