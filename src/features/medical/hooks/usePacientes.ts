import { useState, useEffect, useCallback } from 'react'
import { listPacientes, insertPaciente, updatePaciente } from '../data/pacientes'
import type { Paciente } from '../types'

export function usePacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)

  const recargar = useCallback(async () => {
    setLoading(true)
    try { setPacientes(await listPacientes()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  const addPaciente = useCallback(async (data: Partial<Paciente>) => {
    const { data: row, error } = await insertPaciente(data)
    if (error) return { error }
    setPacientes(p => [...p, row as Paciente])
    return { data: row as Paciente }
  }, [])

  const editPaciente = useCallback(async (id: string, data: Partial<Paciente>) => {
    const { data: row, error } = await updatePaciente(id, data)
    if (error) return { error }
    setPacientes(p => p.map(x => (x.id === id ? (row as Paciente) : x)))
    return { data: row as Paciente }
  }, [])

  return { pacientes, loading, addPaciente, editPaciente, recargar }
}
