import {
  candidatos as findCandidates,
  fusionar as mergePatient,
  type Identificable,
} from '@/features/medical/utils/pacienteIdentity'
import type { Paciente } from '@/features/medical/types'
import type { DedupStrategy } from '@/shared/dedup'

function omitIdentityColumns(values: Partial<Paciente>): Partial<Identificable> {
  const result: Partial<Paciente> = { ...values }
  delete result.id
  delete result.mrn
  delete result.created_at
  delete result.updated_at
  return result
}

/** Adapts patient identity matching and merging without copying identity or audit columns. */
export const pacienteDedupStrategy: DedupStrategy<Identificable> = {
  entidad: 'pacientes',
  candidatos: (item, existing) => {
    const candidates = findCandidates(item, existing)
    return candidates.map(({ nivel: level, paciente: patient }) => ({ nivel: level, item: patient }))
  },
  fusionar: (existing, incoming) => {
    const { paciente: patient, choques: conflicts } = mergePatient(
      omitIdentityColumns(existing),
      omitIdentityColumns(incoming),
    )
    return { resultado: patient, choques: conflicts }
  },
}

export default pacienteDedupStrategy

// Bridges Medical identity rules to the shared deduplication contract while protecting persisted identity.
