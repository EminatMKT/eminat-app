import { supabase } from '@/shared/db/supabase'
import { TABLES, COLUMNS } from './tables'

// Capa de acceso a datos para la tabla `actividades`.

// Lista actividades por created_at desc. Si se pasa responsableRef, filtra por él.
export const list = (responsableRef?: string) => {
  let q = supabase.from(TABLES.actividades).select('*').order(COLUMNS.createdAt, { ascending: false })
  if (responsableRef) q = q.eq('responsable_ref', responsableRef)
  return q
}

// Crea una actividad (insert + select + single).
export const create = (payload: any) =>
  supabase.from(TABLES.actividades).insert(payload).select().single()

// Actualiza el estado de una actividad.
export const updateEstado = (id: string, estado: string) =>
  supabase.from(TABLES.actividades).update({ estado }).eq('id', id)
