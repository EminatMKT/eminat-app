import { supabase } from '@/shared/db/supabase'
import { TABLES, COLUMNS } from './tables'

// Capa de acceso a datos para la tabla `actividades`.

// Lista actividades por created_at desc. Sin filtro por persona: quien tiene el
// módulo Stratix ve el tablero entero, y quien no lo tiene no recibe ninguna fila
// —lo decide la policy `colaborador_read`, que es `has_module('stratix-mkt')`—.
// Lo de "cada uno ve solo lo suyo" era un filtro de ESTE archivo, no de la RLS:
// convertía un tablero de equipo en una lista personal. Lo que sí es personal
// —el reporte de pago, "mis tareas"— se resuelve filtrando en la vista.
export const list = () =>
  supabase.from(TABLES.actividades).select('*').order(COLUMNS.createdAt, { ascending: false })

// Crea una actividad (insert + select + single).
export const create = (payload: Record<string, unknown>) =>
  supabase.from(TABLES.actividades).insert(payload).select().single()

// Actualiza el estado de una actividad. `.select().single()` convierte
// "0 filas afectadas" (la tarea ya fue borrada por otro usuario) en error,
// en vez de un ok fantasma que resucite la fila en el estado local.
export const updateEstado = (id: string, estado: string) =>
  supabase.from(TABLES.actividades).update({ estado }).eq('id', id).select().single()

// Corrige la fecha de entrega. Existe porque una fecha mal cargada no tenía arreglo desde
// la app: seis filas con el año 0206 colgaron el Gantt durante meses y nadie podía tocarlas.
// NO toca `mes` ni `trimestre`: son el período de imputación del reporte de pago, una
// decisión aparte de cuándo se entrega (ver el pendiente de `mes` en .todo/TODO.md).
export const updateFecha = (id: string, fecha_entrega: string) =>
  supabase.from(TABLES.actividades).update({ fecha_entrega }).eq('id', id).select().single()

// Edita cualquier campo de la actividad. El payload completo viaja entero
// (con nulls para vacíos): editar tiene que poder LIMPIAR campos, no solo
// cambiarlos — omitirlos dejaría el valor viejo clavado. `.select().single()`
// convierte "0 filas afectadas" (la tarea ya fue borrada por otro usuario)
// en error, en vez de un ok fantasma que resucite la fila en el estado local.
export const update = (id: string, payload: Record<string, unknown>) =>
  supabase.from(TABLES.actividades).update(payload).eq('id', id).select().single()

// Mismo criterio: si la fila ya no existe, single() falla y la UI muestra error.
export const remove = (id: string) =>
  supabase.from(TABLES.actividades).delete().eq('id', id).select().single()
