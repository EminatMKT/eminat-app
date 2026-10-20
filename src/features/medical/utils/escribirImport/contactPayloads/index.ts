import type { PacienteContacto } from '@/features/medical/types'
import type { FuentePaciente } from '@/features/medical/constants'
import type { ContactoEntrante } from '@/features/medical/utils/pacienteImportPlan'

// Same shape `upsertPacienteContactos` expects: a `paciente_contactos` row without the columns
// the database itself sets.
type ContactoPayload = Omit<PacienteContacto, 'id' | 'created_at'>

const KEY_SEPARATOR = '|'

// One row per (tipo, valor) a member brought, with THAT member's own source -not the merged
// patient's, which means nothing for a single contact.
function payloadContactos(
  id: string,
  miembros: { contactos: ContactoEntrante[]; fuente: { fuente: FuentePaciente; clave_origen: string | null } }[],
): ContactoPayload[] {
  const result: ContactoPayload[] = []
  for (const miembro of miembros) {
    for (const contacto of miembro.contactos) {
      const fila: ContactoPayload = {
        paciente_id: id,
        tipo: contacto.tipo,
        valor: contacto.valor,
        fuente: miembro.fuente.fuente,
        clave_origen: miembro.fuente.clave_origen,
      }
      result.push(fila)
    }
  }
  return result
}

// Dedupes by the UNIQUE constraint's own key. `ignoreDuplicates: true` in `data/pacientes.ts`
// is what actually keeps the batch alive; this only keeps `contactosEscritos` honest.
function dedupeContactos(rows: ContactoPayload[]): ContactoPayload[] {
  const seen = new Set<string>()
  const result: ContactoPayload[] = []
  for (const row of rows) {
    const key = [row.paciente_id, row.tipo, row.valor, row.fuente].join(KEY_SEPARATOR)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(row)
  }
  return result
}

payloadContactos.dedupe = dedupeContactos

export default payloadContactos

// Extracted out of `escribirImport/index.ts` to keep that file under the line-count ceiling.
