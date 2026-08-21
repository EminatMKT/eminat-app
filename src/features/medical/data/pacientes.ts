import { supabase } from '@/shared/db/supabase'
import { TABLES } from '@/shared/data/tables'
import { listAllRows } from '@/shared/data/paginated'
import type { Paciente, PacienteFuente } from '../types'

export const listPacientes = () => listAllRows<Paciente>(TABLES.pacientes, 'apellido')
export const listPacienteFuentes = () => listAllRows<PacienteFuente>(TABLES.pacienteFuentes, 'fuente')

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
