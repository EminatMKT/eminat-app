import type { EstadoDecidir } from './types'

/** Nothing in flight and nothing failed. */
export const IDLE: Omit<EstadoDecidir, 'pair'> = { ocupado: false, errorDescarte: false, errorFusion: false }
/** What a failed discard leaves on its pair. */
export const FAILED_DISCARD: Partial<EstadoDecidir> = { errorDescarte: true }
/** What a failed merge leaves on its pair. */
export const FAILED_MERGE: Partial<EstadoDecidir> = { errorFusion: true }
