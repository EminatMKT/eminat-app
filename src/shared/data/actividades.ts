import { supabase } from '@/shared/db/supabase'
import { TABLES, COLUMNS } from './tables'

// Capa de acceso a datos para la tabla `actividades`.

// Lista actividades por created_at desc. Si se pasa `usuarioId`, deja solo las
// que le pertenecen: las que ejecuta (`responsable_id`) **o** las que pidió
// (`solicitante_id`). Las dos mitades son necesarias — el reporte de miembro
// cuenta "lo que ejecuto más lo que pedí", así que filtrar solo por responsable
// dejaba a los no-admin sin poder ver nunca lo que delegaron: la tarea aparecía
// por el update optimista y desaparecía al recargar.
export const list = (usuarioId?: string) => {
  let q = supabase.from(TABLES.actividades).select('*').order(COLUMNS.createdAt, { ascending: false })
  if (usuarioId) q = q.or(`responsable_id.eq.${usuarioId},solicitante_id.eq.${usuarioId}`)
  return q
}

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
