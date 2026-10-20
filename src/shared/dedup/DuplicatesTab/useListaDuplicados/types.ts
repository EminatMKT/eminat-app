import type { Pendiente } from '@/shared/dedup/types'

/** The queue's whole state: the pairs, their display names, and whether a scan or a read failed. */
export type EstadoLista = {
  pendientes: Pendiente[]
  summaries: Record<string, string>
  namesLoading: boolean
  ocupado: boolean
  error: boolean
}
