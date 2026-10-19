import type { EstadoLista } from './types'

/** Nothing loaded, nothing running, nothing failed. */
export const INICIAL: EstadoLista = {
  pendientes: [],
  summaries: {},
  namesLoading: false,
  ocupado: false,
  error: false,
}

/** The reload counter before the first reload: every reload takes the next number. */
export const NO_REQUEST_YET = 0
