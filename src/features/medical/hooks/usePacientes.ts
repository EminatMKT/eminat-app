import { useState, useEffect, useCallback } from 'react'
import { listPacientes, listPacienteFuentes, listPacienteContactos, insertPaciente, updatePaciente, upsertPacienteContactos } from '../data/pacientes'
import { escribirImport, type FilaEscritura, type ResultadoEscritura } from '../utils/escribirImport'
import type { Paciente, PacienteFuente, PacienteContacto } from '../types'

export function usePacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  // Identidad de origen del import (fuente + clave_origen → paciente_id, o null = tumba). Se
  // carga entera junto con `pacientes` -mismo criterio, ver el spec de import: el matcheo tiene
  // que ver la tabla completa, no una página- aunque solo la use el modal de import.
  const [pacienteFuentes, setPacienteFuentes] = useState<PacienteFuente[]>([])
  // Todo teléfono/email visto, con su procedencia. Misma razón que `pacienteFuentes`: se carga
  // entera junto con el resto, no por paciente.
  const [pacienteContactos, setPacienteContactos] = useState<PacienteContacto[]>([])
  const [loading, setLoading] = useState(true)

  const recargar = useCallback(async () => {
    setLoading(true)
    try {
      const [p, f, c] = await Promise.all([listPacientes(), listPacienteFuentes(), listPacienteContactos()])
      setPacientes(p); setPacienteFuentes(f); setPacienteContactos(c)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  const addPaciente = useCallback(async (data: Partial<Paciente>) => {
    const { data: row, error } = await insertPaciente(data)
    if (error) return { error }
    const nuevo = row as Paciente
    // Mismo criterio que `editPaciente`: el teléfono/email que se cargó en el alta manual
    // también va a `paciente_contactos`, no solo a `pacientes.telefono`/`email`. Sin esto un
    // paciente creado a mano queda con el dato en la columna principal pero CERO filas en
    // `paciente_contactos`, y la pantalla de contactos (Tarea 10) lo muestra vacío.
    const contactos: Omit<PacienteContacto, 'id' | 'created_at'>[] = []
    for (const tipo of ['telefono', 'email'] as const) {
      const v = (data[tipo] ?? '').trim()
      if (v) contactos.push({ paciente_id: nuevo.id, tipo, valor: v, fuente: 'manual', clave_origen: null })
    }
    if (contactos.length) await upsertPacienteContactos(contactos)
    setPacientes(p => [...p, nuevo])
    return { data: nuevo }
  }, [])

  const editPaciente = useCallback(async (id: string, data: Partial<Paciente>) => {
    // El principal pasa a ser el nuevo -acá sí, a diferencia de un import: una edición a mano es
    // una decisión explícita de una persona-. Pero el anterior NO se pierde: queda como contacto.
    // Sin esto, editar un teléfono lo pisa y lo borra, que es exactamente el bug que motivó todo
    // este trabajo, reintroducido por la puerta del alta manual.
    const previo = pacientes.find(p => p.id === id)
    const contactos: Omit<PacienteContacto, 'id' | 'created_at'>[] = []
    for (const tipo of ['telefono', 'email'] as const) {
      for (const valor of [previo?.[tipo], data[tipo]]) {
        const v = (valor ?? '').trim()
        if (v) contactos.push({ paciente_id: id, tipo, valor: v, fuente: 'manual', clave_origen: null })
      }
    }
    if (contactos.length) await upsertPacienteContactos(contactos)

    const { data: row, error } = await updatePaciente(id, data)
    if (error) return { error }
    setPacientes(p => p.map(x => (x.id === id ? (row as Paciente) : x)))
    return { data: row as Paciente }
  }, [pacientes])

  // Escritura por lotes del import: sin transacción, así que `recargar()` trae el estado real
  // de la base incluso si `escribirImport` cortó a mitad de camino por un lote que falló.
  const importarPacientes = useCallback(async (filas: readonly FilaEscritura[]): Promise<ResultadoEscritura> => {
    const resultado = await escribirImport(filas)
    if (resultado.filasEscritas > 0) await recargar()
    return resultado
  }, [recargar])

  return { pacientes, pacienteFuentes, pacienteContactos, loading, addPaciente, editPaciente, recargar, importarPacientes }
}
