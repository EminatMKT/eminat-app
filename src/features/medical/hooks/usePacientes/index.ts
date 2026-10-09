import { useCallback } from 'react'
import { escribirImport, type FilaEscritura, type ResultadoEscritura } from '@/features/medical/utils/escribirImport'
import type { Paciente } from '@/features/medical/types'
import useRegistryState from './useRegistryState'
import mutations from './mutations'

/** The full patient registry, loaded on demand through `ensureLoaded` instead of on mount — the
 *  Dashboard reads aggregate counts through `usePatientDashboardAggregate` instead. */
export function usePacientes() {
  const registry = useRegistryState()
  const { pacientes, recargar, addLocal, updateLocal } = registry

  const addPaciente = useCallback(async (data: Partial<Paciente>) => {
    const result = await mutations.add(data)
    if ('data' in result) addLocal(result.data)
    return result
  }, [addLocal])

  const editPaciente = useCallback(async (id: string, data: Partial<Paciente>) => {
    const previo = pacientes.find(p => p.id === id)
    const result = await mutations.edit(id, data, previo)
    if ('data' in result) updateLocal(id, result.data)
    return result
  }, [pacientes, updateLocal])

  // Escritura por lotes del import: sin transacción, así que `recargar()` trae el estado real
  // de la base incluso si `escribirImport` cortó a mitad de camino por un lote que falló.
  const importarPacientes = useCallback(async (filas: readonly FilaEscritura[]): Promise<ResultadoEscritura> => {
    const resultado = await escribirImport(filas)
    if (resultado.filasEscritas > 0) await recargar()
    return resultado
  }, [recargar])

  const api = {
    ...registry,
    addPaciente,
    editPaciente,
    importarPacientes,
  }
  return api
}
