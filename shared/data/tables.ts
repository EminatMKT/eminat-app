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
} as const

export type TableName = (typeof TABLES)[keyof typeof TABLES]
