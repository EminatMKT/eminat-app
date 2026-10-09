import { useState, useCallback, useMemo } from 'react'
import type { Paciente, PacienteFuente, PacienteContacto } from '@/features/medical/types'
import load from './load'
import localUpdates from './localUpdates'

type RegistryState = {
  pacientes: Paciente[]
  pacienteFuentes: PacienteFuente[]
  pacienteContactos: PacienteContacto[]
  loading: boolean
  loaded: boolean
}

const START: RegistryState = {
  pacientes: [],
  pacienteFuentes: [],
  pacienteContactos: [],
  loading: false,
  loaded: false,
}

/** Owns the full patient registry's state: the three tables `load.recargar` fetches together,
 *  `loading`/`loaded`, and the local updates a write applies without a full reload. */
export default function useRegistryState() {
  const [state, setState] = useState(START)
  const { pacientes, pacienteFuentes, pacienteContactos, loading, loaded } = state
  const { addLocal, updateLocal } = useMemo(() => localUpdates(setState), [])

  const recargar = useCallback(() => load.recargar(setState), [])
  const ensureLoaded = useCallback(() => load.ensureLoaded(loaded, setState), [loaded])

  const api = {
    pacientes,
    pacienteFuentes,
    pacienteContactos,
    loading,
    loaded,
    recargar,
    ensureLoaded,
    addLocal,
    updateLocal,
  }
  return api
}

// `load.ts` and `localUpdates.ts` own the actual logic; this hook only wires React state to
// them, so nothing here fetches on mount — the composing `usePacientes` stays fully lazy.
