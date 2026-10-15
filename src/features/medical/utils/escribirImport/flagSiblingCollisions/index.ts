import { candidatos, type Identificable } from '@/features/medical/utils/pacienteIdentity'
import registrar from '@/shared/dedup/data/registrar'
import { ORIGEN_IMPORT } from '@/shared/dedup/types'
import type { Paciente } from '@/features/medical/types'

type FilaResuelta = { id: string; paciente: Partial<Paciente> }

function toIdentificable({ id, paciente }: FilaResuelta): Identificable {
  const { nombre, apellido, fecha_nacimiento, telefono, email } = paciente
  const identificable: Identificable = {
    id,
    nombre: nombre ?? '',
    apellido: apellido ?? '',
    fecha_nacimiento: fecha_nacimiento ?? null,
    telefono,
    email,
  }
  return identificable
}

/** Flags same-batch sibling collisions among newly-inserted rows: two 'nueva' rows in ONE
 *  import batch that turn out to be the same person. Matches against the pre-existing roster
 *  are already covered by `toMerge` at plan-build time -this only compares siblings. */
export default async function flagSiblingCollisions(freshRows: FilaResuelta[]): Promise<{ failed: number }> {
  const identificables = freshRows.map(toIdentificable)
  let failed = 0
  // ponytail: O(n^2) over up to one batch's rows (TAMANO_LOTE, not the whole import) is fine;
  // it stops being fine only if the batch size grows well past 500.
  for (let i = 0; i < identificables.length; i++) {
    const matches = candidatos(identificables[i], identificables.slice(i + 1))
    for (const match of matches) {
      const args = {
        entidad: 'pacientes',
        itemIdA: identificables[i].id,
        itemIdB: match.paciente.id,
        nivel: match.nivel,
        origen: ORIGEN_IMPORT,
      }
      try {
        await registrar(args)
      } catch {
        failed += 1
      }
    }
  }
  if (failed > 0) {
    const message = `flagSiblingCollisions: ${failed} registrar call(s) failed`
    console.warn(message)
  }
  const resultado = { failed }
  return resultado
}

// Reuses `pacienteIdentity.candidatos` -this module decides nothing about identity, it only
// turns a sibling match into an ambient `registrar` call.
