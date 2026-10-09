import { insertPaciente, updatePaciente, upsertPacienteContactos } from '@/features/medical/data/pacientes'
import type { Paciente } from '@/features/medical/types'
import contactRows from '../contactos'

// A manual add/edit writes the phone/email to `paciente_contactos` too, not only to the
// patient's own columns — otherwise the contacts screen shows none for it.

async function create(data: Partial<Paciente>) {
  const { data: row, error } = await insertPaciente(data)
  if (error) return { error }
  const created: Paciente = row
  const candidates = { telefono: [data.telefono], email: [data.email] }
  const contactos = contactRows(created.id, candidates)
  if (contactos.length) await upsertPacienteContactos(contactos)
  return { data: created }
}

// The edit's own value becomes the patient's main one, but the previous value survives as a
// contact instead of being overwritten away.
async function update(id: string, data: Partial<Paciente>, previo: Paciente | undefined) {
  const candidates = {
    telefono: [previo?.telefono, data.telefono],
    email: [previo?.email, data.email],
  }
  const contactos = contactRows(id, candidates)
  if (contactos.length) await upsertPacienteContactos(contactos)
  const { data: row, error } = await updatePaciente(id, data)
  if (error) return { error }
  const updated: Paciente = row
  return { data: updated }
}

// Exposed as `add`/`edit` (matching the hook's own public names), not `create`/`update`: the
// calling hook already reports outcomes through its own `addPaciente`/`editPaciente` — a plain
// `mutations.update(...)` read as a bare verb to the eye the same way the hook's own feedback
// layer does.
const mutations = { add: create, edit: update }

/** The two patient writes the registry hook wraps with its own state update and the shared
 *  contact-row bookkeeping. Each returns `{ data }` or `{ error }` instead of throwing. */
export default mutations
