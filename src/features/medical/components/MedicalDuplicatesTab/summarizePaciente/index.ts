import type { Paciente } from '@/features/medical/types'

/** How a patient reads in the duplicate review — the list rows and the open pair alike. */
export default function summarizePaciente({ nombre, apellido }: Pick<Paciente, 'nombre' | 'apellido'>): string {
  const summary = `${nombre} ${apellido}`
  return summary
}

// One summary for both places a patient is named in the duplicate review, so they never drift.
