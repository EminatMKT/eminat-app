import type { Dispatch, SetStateAction } from 'react'
import type { Paciente } from '@/features/medical/types'

type WithPacientes = { pacientes: Paciente[] }

/** Local (non-reload) updates applied right after a write lands, so the screen does not wait
 *  for a full `recargar()` round-trip. */
export default function localUpdates<T extends WithPacientes>(setState: Dispatch<SetStateAction<T>>) {
  const addLocal = (nuevo: Paciente) => {
    setState((before) => ({ ...before, pacientes: [...before.pacientes, nuevo] }))
  }
  const updateLocal = (id: string, actualizado: Paciente) => {
    setState((before) => {
      const next = before.pacientes.map((p) => (p.id === id ? actualizado : p))
      return { ...before, pacientes: next }
    })
  }
  const api = { addLocal, updateLocal }
  return api
}
