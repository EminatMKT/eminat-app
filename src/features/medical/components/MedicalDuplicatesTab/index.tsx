'use client'
import { useT } from '@/shared/i18n'
import DuplicatesTab from '@/shared/dedup/DuplicatesTab'
import { getPaciente } from '@/features/medical/data/pacientes'
import type { Paciente } from '@/features/medical/types'
import comparePacientes from './comparePacientes'

async function loadPaciente(id: string): Promise<Paciente> {
  const { data } = await getPaciente(id)
  const patient: Paciente = data
  return patient
}

function summarizePaciente({ nombre, apellido }: Paciente): string {
  const summary = `${nombre} ${apellido}`
  return summary
}

/** Medical's wrapper over the shared duplicate-review screen: loads a patient by id, shows
 *  `nombre apellido` as the pair's summary, and compares every clinical field `fusionar()`
 *  reported as a conflict. */
export default function MedicalDuplicatesTab() {
  const { t } = useT()
  return (
    <DuplicatesTab
      entidad="pacientes"
      cargarItem={loadPaciente}
      renderResumen={summarizePaciente}
      renderComparacion={(a, b, onChoose) => comparePacientes(a, b, onChoose, t)}
    />
  )
}

// Delegates field comparison to `comparePacientes`/`FIELD_MAPS`; this file only wires Medical's
// patient shape into the shared `DuplicatesTab` contract.
