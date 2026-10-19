import pacienteDedupStrategy from '@/features/medical/utils/pacienteDedupStrategy'
import registrar from '@/shared/dedup/data/registrar'
import { ORIGEN_ALTA_MANUAL } from '@/shared/dedup/types'
import type { Paciente } from '@/features/medical/types'

/** Best-effort ambient signal: flags every roster match for a freshly created patient through
 *  `registrar_candidato_duplicado`, instead of waiting for the next manual scan to find it. */
export default async function dedupSignal(fresh: Paciente, roster: readonly Paciente[]): Promise<{ failed: number }> {
  const candidates = pacienteDedupStrategy.candidatos(fresh, roster)
  let failed = 0
  for (const candidate of candidates) {
    const args = {
      entidad: 'pacientes',
      itemIdA: fresh.id,
      itemIdB: candidate.item.id,
      nivel: candidate.nivel,
      origen: ORIGEN_ALTA_MANUAL,
    }
    // The RPC resolves `{ error }` on a database failure and only rejects on a network one; both
    // are recorded, never rethrown: this signal never blocks the add it rides on.
    const fallo = await registrar(args).then(({ error }) => Boolean(error), () => true)
    if (fallo) failed += 1
  }
  if (failed > 0) {
    const message = `dedupSignal: ${failed} registrar call(s) failed`
    console.warn(message)
  }
  return { failed }
}

// Reuses `pacienteDedupStrategy`'s own matching rules -this module decides nothing about
// identity, it only turns a match into an ambient `registrar` call.
