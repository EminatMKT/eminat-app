import { getPaciente } from '@/features/medical/data'
import type { Paciente } from '@/features/medical/types'

/** One patient by id for the duplicate review, or a rejection when the read fails. */
export default async function loadPaciente(id: string): Promise<Paciente> {
  const { data, error } = await getPaciente(id)
  if (error) throw error
  const patient: Paciente = data
  return patient
}

// Supabase resolves `{ error }` rather than throwing: rethrowing it is what lets
// `useAbrirPendiente`'s catch mark the pair as failed to open instead of opening nothing.
