import { supabase } from '@/shared/db'
import type { FilterValues } from '@/shared/utils'
import { TABLES } from '../tables'

// El CRUD de `vistas_filtro`: las combinaciones de filtros que cada persona guardó con nombre.
//
// NINGUNA de estas funciones filtra por `usuario_id` al leer — lo hace la RLS, y pedirlo de nuevo
// acá sería una segunda fuente de verdad sobre quién ve qué, de esas que se desincronizan el día
// que una cambia.
export type VistaFiltro = {
  id: string
  ambito: string
  nombre: string
  valores: FilterValues
  ocultos: string[]
  abre_por_defecto: boolean
}

export const list = (ambito: string) =>
  supabase.from(TABLES.vistasFiltro).select('*').eq('ambito', ambito).order('nombre')

export const create = (payload: Omit<VistaFiltro, 'id'> & { usuario_id: string }) =>
  supabase.from(TABLES.vistasFiltro).insert(payload).select().single()

// `.select().single()` convierte "0 filas afectadas" (otra pestaña ya la borró) en error, en vez
// de un ok fantasma que resucite la vista en el estado local. Mismo criterio que `actividades`.
export const update = (id: string, payload: Partial<Omit<VistaFiltro, 'id'>>) =>
  supabase.from(TABLES.vistasFiltro)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()

export const remove = (id: string) =>
  supabase.from(TABLES.vistasFiltro).delete().eq('id', id)
