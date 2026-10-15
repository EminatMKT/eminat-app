export type NivelCandidato = 'exacta' | 'parcial'

export interface DedupStrategy<T> {
  entidad: string
  candidatos(item: T, existentes: readonly T[]): { nivel: NivelCandidato; item: T }[]
  fusionar(existente: Partial<T>, entrante: Partial<T>): { resultado: Partial<T>; choques: string[] }
}
