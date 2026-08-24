import { supabase } from '@/shared/db/supabase'
import { TABLES } from '@/shared/data/tables'
import { listAllRows } from '@/shared/data/paginated'
import type { Paciente, PacienteFuente, PacienteContacto } from '../types'

export const listPacientes = () => listAllRows<Paciente>(TABLES.pacientes, 'apellido')
export const listPacienteFuentes = () => listAllRows<PacienteFuente>(TABLES.pacienteFuentes, 'fuente')
export const listPacienteContactos = () =>
  listAllRows<PacienteContacto>(TABLES.pacienteContactos, 'created_at')

export const insertPaciente = (data: Partial<Paciente>) =>
  supabase.from(TABLES.pacientes).insert([data]).select().single()

export const updatePaciente = (id: string, data: Partial<Paciente>) =>
  supabase.from(TABLES.pacientes).update(data).eq('id', id).select().single()

export const deletePaciente = (id: string) =>
  supabase.from(TABLES.pacientes).delete().eq('id', id)

// El id lo genera el CLIENTE (crypto.randomUUID) para que el upsert sea idempotente: sin
// una clave sobre la que hacer onConflict, reintentar un lote insertaría todo de nuevo.
export const upsertPacientes = (rows: Partial<Paciente>[]) =>
  supabase.from(TABLES.pacientes).upsert(rows, { onConflict: 'id' }).select('id')

export const upsertPacienteFuentes = (rows: PacienteFuente[]) =>
  supabase.from(TABLES.pacienteFuentes).upsert(rows, { onConflict: 'fuente,clave_origen' })

// `ignoreDuplicates: true` NO es un detalle: es lo que hace que el lote sobreviva. Genera
// `ON CONFLICT ... DO NOTHING`, que tolera dos filas idénticas en el MISMO comando. Con
// `DO UPDATE` (el default de supabase-js) el mismo lote aborta entero con
// `ON CONFLICT DO UPDATE command cannot affect row a second time` — verificado contra el
// Postgres local: DO NOTHING deja 1 fila sin error, DO UPDATE tira ERROR.
// Y es lo correcto además de lo seguro: un contacto no tiene nada que actualizar; existe o no.
export const upsertPacienteContactos = (rows: Omit<PacienteContacto, 'id' | 'created_at'>[]) =>
  supabase.from(TABLES.pacienteContactos)
    .upsert(rows, { onConflict: 'paciente_id,tipo,valor,fuente', ignoreDuplicates: true })
