/** The columns every activity read asks for, the responsables embed included. */
const ACTIVITY_SELECT = `
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

export default ACTIVITY_SELECT

// No `responsable_id`: the column is gone, and who executes a task comes from the embedded join
// table. The embed names its foreign key because `actividad_responsables` reaches `actividades`
// by one key only today, and PostgREST refuses an ambiguous embed the day a second one appears.
// Every read and every write-back uses this list, so a Kanban move never blanks the assignees.
