export type NivelCandidato = typeof NIVEL_EXACTA | 'parcial'

/** One existing record a strategy flags as a possible duplicate of an incoming one. */
export type Candidate<T> = { nivel: NivelCandidato; item: T }

/** What a strategy's merge produces: the combined record, and the fields both sides disagreed on. */
export type MergeResult<T> = { resultado: Partial<T>; choques: string[] }

export interface DedupStrategy<T> {
  entidad: string
  candidatos(item: T, existentes: readonly T[]): Candidate<T>[]
  fusionar(existente: Partial<T>, entrante: Partial<T>): MergeResult<T>
}

/** A pair as returned by `duplicados_pendientes`: not yet merged or discarded. */
export type Pendiente = {
  item_id_a: string
  item_id_b: string
  nivel: NivelCandidato
  detectado_at: string
}

/** `duplicados_pendientes.nivel` value for the stronger match level. Named so a comparison
 *  against it is never a retyped literal. */
export const NIVEL_EXACTA = 'exacta'

/** The two values `decidir_descarte_duplicado` accepts as `p_motivo`. */
export const MOTIVO_NO_ES_LA_MISMA = 'no_son_la_misma'
export const MOTIVO_SEPARADAS = 'son_la_misma_separadas'

/** Convention-only values for `registrar_candidato_duplicado`'s `p_origen` — the database
 *  doesn't constrain it, but every caller should still spell it from one of these. */
export const ORIGEN_ALTA_MANUAL = 'alta_manual'
export const ORIGEN_IMPORT = 'import'
