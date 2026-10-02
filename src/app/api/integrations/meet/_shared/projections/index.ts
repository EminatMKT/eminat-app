const TEAM_WITH_DEPARTMENT = 'equipos!usuarios_equipo_id_fkey(id, codigo, nombre, activo, departamentos(id, codigo, nombre))'
const RESPONSIBLE_USER = `usuarios!actividad_responsables_usuario_id_fkey(id, nombre_display, nombre, apellido, ${TEAM_WITH_DEPARTMENT})`
const RESPONSIBLES = `actividad_responsables!actividad_responsables_actividad_id_fkey(usuario_id, es_lider, ${RESPONSIBLE_USER})`

/** The `select` strings the Meet API reads with, named once per shape it needs. */
const MEET_PROJECTIONS = {
  task: `id, titulo, descripcion, estado, fecha_inicio, fecha_entrega, fecha_requerida, empresa, updated_at, ${RESPONSIBLES}`,
  topicOwner: 'id, meetings!inner(user_id)',
  topicLink: 'id, actividad_id, meetings!inner(user_id)',
  topicOrigin: 'actividad_id, meetings(id, title, user_id, empresas(nombre))',
  viewerProfile: 'id, equipo_id, empresa_id, equipos!usuarios_equipo_id_fkey(id, nombre), empresas(id, codigo, nombre)',
  directoryUser: 'id, equipo_id, empresa_id',
  assigneeCheck: 'id, rol, activo',
  catalogRow: 'id, codigo, nombre',
  teamRow: 'id, codigo, nombre, departamento_id, activo',
  assigneeRow: `id, nombre_display, nombre, apellido, rol, equipo_id, ${TEAM_WITH_DEPARTMENT}`,
} as const

export default MEET_PROJECTIONS

// MEET_PROJECTIONS keeps every select string of the Meet API in one place, so the embeds a
// schema change touches (like the move to actividad_responsables) are edited once.
