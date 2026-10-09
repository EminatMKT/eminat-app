import type { PacienteContacto } from '@/features/medical/types'

const TIPOS = ['telefono', 'email'] as const

/** One `paciente_contactos` row per non-empty, trimmed candidate value, so a manual add or edit
 *  never loses a phone/email that already lived on the patient's main columns. */
export default function contactRows(
  pacienteId: string,
  porTipo: Record<'telefono' | 'email', (string | undefined)[]>,
): Omit<PacienteContacto, 'id' | 'created_at'>[] {
  const filas: Omit<PacienteContacto, 'id' | 'created_at'>[] = []
  for (const tipo of TIPOS) {
    for (const candidato of porTipo[tipo]) {
      const value = (candidato ?? '').trim()
      if (value) {
        const fila: Omit<PacienteContacto, 'id' | 'created_at'> = {
          paciente_id: pacienteId,
          tipo,
          valor: value,
          fuente: 'manual',
          clave_origen: null,
        }
        filas.push(fila)
      }
    }
  }
  return filas
}
