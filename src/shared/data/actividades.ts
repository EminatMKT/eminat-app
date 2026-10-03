import { supabase } from '@/shared/db/supabase'
import { TABLES, COLUMNS } from './tables'
import RPCS from './rpcs'

// Capa de acceso a datos para la tabla `actividades`.

type ActivityRow = Record<string, unknown> & { id: string; updated_at?: string }
type ActivityResponsableRow = { usuario_id: string; es_lider: boolean }
type ActivityRowWithEmbed = ActivityRow & { actividad_responsables?: ActivityResponsableRow[] | null }

// No responsable_id: the column is gone; who executes a task comes from the embedded join table.
const ACTIVIDADES_SELECT = `
  id,
  titulo,
  descripcion,
  empresa,
  dias_produccion,
  horas,
  trimestre,
  mes,
  semana,
  fecha_inicio,
  fecha_requerida,
  fecha_entrega,
  estado,
  verificado,
  solicitante_id,
  drive_url,
  aprobado_por_id,
  fecha_aprobacion,
  notas_jefe,
  bloqueada,
  created_by_id,
  created_at,
  updated_at,
  sheet_row,
  actividad_responsables!actividad_responsables_actividad_id_fkey(usuario_id, es_lider)
`

function withResponsables(row: ActivityRowWithEmbed): ActivityRow {
  const { actividad_responsables, ...actividad } = row
  return { ...actividad, responsables: actividad_responsables ?? [] }
}

function withOptionalResponsables(row: unknown): ActivityRow | null {
  if (!row) return null
  return withResponsables(row as ActivityRowWithEmbed)
}

function mapActivityRows(rows: ActivityRowWithEmbed[] | null): ActivityRow[] | null {
  if (!rows) return rows
  return rows.map(withResponsables)
}
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
  // Every read carries the responsables embed: a row without it would blank the assignees on
  // screen after a Kanban move.
  const result = await supabase.from(TABLES.actividades).update(payload)
    .eq('id', id).eq('updated_at', expectedUpdatedAt).select(ACTIVIDADES_SELECT).maybeSingle()
  if (result.error) return { data: null, error: result.error, conflict: false }
  if (result.data) return { data: withOptionalResponsables(result.data), error: null, conflict: false }

  const current = await supabase.from(TABLES.actividades).select(ACTIVIDADES_SELECT).eq('id', id).maybeSingle()
  const conflicto: OptimisticUpdateResult = {
    data: null,
    error: current.error,
    conflict: true,
    current: withOptionalResponsables(current.data),
  }
  return conflicto
}

// Lista actividades por created_at desc. Sin filtro por persona: quien tiene el
// módulo Stratix ve el tablero entero, y quien no lo tiene no recibe ninguna fila
// —lo decide la policy `colaborador_read`, que es `has_module('stratix-mkt')`—.
// Lo de "cada uno ve solo lo suyo" era un filtro de ESTE archivo, no de la RLS:
// convertía un tablero de equipo en una lista personal. Lo que sí es personal
// —el reporte de pago, "mis tareas"— se resuelve filtrando en la vista.
export const list = async () => {
  const result = await supabase
    .from(TABLES.actividades)
    .select(ACTIVIDADES_SELECT)
    .order(COLUMNS.createdAt, { ascending: false })

  return { ...result, data: mapActivityRows(result.data as ActivityRowWithEmbed[] | null) }
}

// Crea una actividad (insert + select + single).
export const create = async (payload: Record<string, unknown>) => {
  const result = await supabase.from(TABLES.actividades).insert(payload).select(ACTIVIDADES_SELECT).single()
  const creada = { ...result, data: withOptionalResponsables(result.data) }
  return creada
}

// Replaces the whole set in one transaction, so a failed save never leaves the task
// half-assigned. RLS still applies: the RPC is security invoker.
export const setResponsables = (id: string, rows: ActivityResponsableRow[]) => {
  const args = {
    p_actividad_id: id,
    p_usuario_ids: rows.map(r => r.usuario_id),
    p_lider_id: rows.find(r => r.es_lider)?.usuario_id ?? null,
  }
  return supabase.rpc(RPCS.setActividadResponsables, args)
}

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
