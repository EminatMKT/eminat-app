import type { Dispatch, SetStateAction } from 'react'
import { listPacientes, listPacienteFuentes, listPacienteContactos } from '@/features/medical/data/pacientes'
import type { Paciente, PacienteFuente, PacienteContacto } from '@/features/medical/types'

type RegistryState = {
  pacientes: Paciente[]
  pacienteFuentes: PacienteFuente[]
  pacienteContactos: PacienteContacto[]
  loading: boolean
  loaded: boolean
}

async function recargar(setState: Dispatch<SetStateAction<RegistryState>>) {
  setState((before) => ({ ...before, loading: true }))
  try {
    const calls: [Promise<Paciente[]>, Promise<PacienteFuente[]>, Promise<PacienteContacto[]>] = [
      listPacientes(),
      listPacienteFuentes(),
      listPacienteContactos(),
    ]
    const [p, f, c] = await Promise.all(calls)
    const next: RegistryState = {
      pacientes: p,
      pacienteFuentes: f,
      pacienteContactos: c,
      loading: false,
      loaded: true,
    }
    setState(next)
  } catch {
    setState((before) => ({ ...before, loading: false }))
  }
}

// Only fetches once unless the registry has never loaded; the hook calls this from
// `ensureLoaded` instead of on mount.
async function ensureLoaded(loaded: boolean, setState: Dispatch<SetStateAction<RegistryState>>) {
  if (loaded) return
  await recargar(setState)
}

const load = { recargar, ensureLoaded }

/** Fetches the full patient registry, or just clears `loading` on failure. */
export default load
