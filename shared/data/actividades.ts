import { supabase } from '@/shared/db/supabase'

// Capa de acceso a datos para la tabla `actividades`.

// Lista actividades por created_at desc. Si se pasa responsableRef, filtra por él.
export const list = (responsableRef?: string) => {
  let q = supabase.from('actividades').select('*').order('created_at', { ascending: false })
  if (responsableRef) q = q.eq('responsable_ref', responsableRef)
  return q
}

// Crea una actividad (insert + select + single).
export const create = (payload: any) =>
  supabase.from('actividades').insert(payload).select().single()

// Actualiza el estado de una actividad.
export const updateEstado = (id: string, estado: string) =>
  supabase.from('actividades').update({ estado }).eq('id', id)
