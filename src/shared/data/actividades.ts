import { supabase } from '@/shared/db/supabase'
import { TABLES, COLUMNS } from './tables'

// Capa de acceso a datos para la tabla `actividades`.

type ActivityRow = Record<string, unknown> & { id: string; updated_at?: string }
export type OptimisticUpdateResult = {
  data: ActivityRow | null
  error: { message: string } | null
  conflict: boolean
  current?: ActivityRow | null
}

async function optimisticUpdate(
  id: string,
  payload: Record<string, unknown>,
  expectedUpdatedAt: string | undefined,
): Promise<OptimisticUpdateResult> {
  if (!expectedUpdatedAt) {
    return { data: null, error: null, conflict: true, current: null }
  }
  const result = await supabase.from(TABLES.actividades).update(payload)
    .eq('id', id).eq('updated_at', expectedUpdatedAt).select().maybeSingle()
  if (result.error) return { data: null, error: result.error, conflict: false }
  if (result.data) return { data: result.data as ActivityRow, error: null, conflict: false }

  const current = await supabase.from(TABLES.actividades).select('*').eq('id', id).maybeSingle()
  return {
    data: null,
    error: current.error,
    conflict: true,
    current: (current.data as ActivityRow | null) ?? null,
  }
}

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

// Las tres ediciones comparan el `updated_at` que la UI leyó. Cero filas significa que otra
// sesión cambió o borró la tarea: se recupera la versión vigente y se devuelve como conflicto.
export const updateEstado = (id: string, estado: string, expectedUpdatedAt?: string) =>
  optimisticUpdate(id, { estado }, expectedUpdatedAt)

// Corrige la fecha de entrega. Existe porque una fecha mal cargada no tenía arreglo desde
// la app: seis filas con el año 0206 colgaron el Gantt durante meses y nadie podía tocarlas.
// NO toca `mes` ni `trimestre`: son el período de imputación del reporte de pago, una
// decisión aparte de cuándo se entrega (ver el pendiente de `mes` en .todo/TODO.md).
export const updateFecha = (id: string, fecha_entrega: string, expectedUpdatedAt?: string) =>
  optimisticUpdate(id, { fecha_entrega }, expectedUpdatedAt)

// Edita cualquier campo de la actividad. El payload completo viaja entero
// (con nulls para vacíos): editar tiene que poder LIMPIAR campos, no solo
// cambiarlos — omitirlos dejaría el valor viejo clavado.
export const update = (id: string, payload: Record<string, unknown>, expectedUpdatedAt?: string) =>
  optimisticUpdate(id, payload, expectedUpdatedAt)

// Mismo criterio: si la fila ya no existe, single() falla y la UI muestra error.
export const remove = (id: string) =>
  supabase.from(TABLES.actividades).delete().eq('id', id).select().single()
