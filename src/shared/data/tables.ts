import SHARED_COLUMNS from './columns/shared'

/** Single source for Supabase table and view names; a rename happens only here. */
export const TABLES = {
  usuarios: 'usuarios',
  equipoHoy: 'v_equipo_hoy',
  actividades: 'actividades',
  notificaciones: 'notificaciones',
  researchLeads: 'research_leads',
  researchActivities: 'research_activities',
  researchCampaigns: 'research_campaigns',
  researchCampaignRecipients: 'research_campaign_recipients',
  billingV2Records: 'billing_v2_records',
  roles: 'roles',
  roleModules: 'role_modules',
  empresas: 'empresas',
  jornadas: 'jornadas',
  vinculaciones: 'vinculaciones',
  departamentos: 'departamentos',
  equipos: 'equipos',
  cargos: 'cargos',
  usuarioCargos: 'usuario_cargos',
  pacientes: 'pacientes',
  pacienteFuentes: 'paciente_fuentes',
  pacienteContactos: 'paciente_contactos',
  reuniones: 'reuniones',
  reunionParticipantes: 'reunion_participantes',
  vistasFiltro: 'vistas_filtro',
  topics: 'topics',
  actividadResponsables: 'actividad_responsables',
} as const

export type TableName = (typeof TABLES)[keyof typeof TABLES]

// Columnas comunes (timestamps cross-cutting) usadas en order/filter en varios
// repos. No constantizamos cada columna puntual (id, email, estado…) — solo las
// que se repiten entre tablas.
export const COLUMNS = {
  createdAt: SHARED_COLUMNS.created.createdAt,
  updatedAt: SHARED_COLUMNS.versioned.updatedAt,
  onlineAt: 'online_at',
} as const
