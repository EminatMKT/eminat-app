// Única fuente de verdad para los nombres de tablas/vistas de Supabase.
// Un rename de tabla se hace SOLO acá; los repos referencian estas constantes
// en vez de strings sueltos (evita typos silenciosos y magic strings dispersos).
export const TABLES = {
  usuarios: 'usuarios',
  equipoHoy: 'v_equipo_hoy',
  actividades: 'actividades',
  notificaciones: 'notificaciones',
  researchLeads: 'research_leads',
  researchActivities: 'research_activities',
  researchCampaigns: 'research_campaigns',
  researchCampaignRecipients: 'research_campaign_recipients',
  cobranzasVentas: 'cobranzas_ventas',
  cobranzasCuentas: 'cobranzas_cuentas',
  cobranzasDepositos: 'cobranzas_depositos',
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
  // El CATÁLOGO de asuntos: un asunto es una fila, único por empresa, aunque se trate en cinco
  // reuniones. No confundir con `reunion_temas`, que es el puente N:N con el tratamiento —qué se
  // dijo de ese asunto ese día— y que todavía no lo lee ningún repo.
  temas: 'temas',
} as const

export type TableName = (typeof TABLES)[keyof typeof TABLES]

// Columnas comunes (timestamps cross-cutting) usadas en order/filter en varios
// repos. No constantizamos cada columna puntual (id, email, estado…) — solo las
// que se repiten entre tablas.
export const COLUMNS = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  onlineAt: 'online_at',
} as const
