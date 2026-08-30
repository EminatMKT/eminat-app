import type { PanelKey, SubItem } from './tipos'

// Sub-tabs de los módulos con panel secundario.
export const SUB_ITEMS: Record<PanelKey, SubItem[]> = {
  mkt: [
    // El tablero es su propia sección: se mira de lejos y no se toca. Production es UNA vista, la
    // única donde se trabaja —el Kanban—, así que tampoco tiene sub-vistas: el Gantt y las horas
    // se leen, no se tocan, y por eso viven en el tablero (ver rules/arquitectura.md).
    { id: 'mkt-dash', icon: '📊', label: 'Dashboard', tab: 'overview' },
    { id: 'sub-prod', icon: '⚡', label: 'Production', tab: 'kanban' },
    { id: 'sub-sol', icon: '📋', label: 'Requests', tab: 'solicitudes' },
    { id: 'sub-social', icon: '📱', label: 'Social Media', tab: 'social' },
    { id: 'sub-competencia', icon: '🎯', label: 'Competitors', tab: 'competencia' },
    { id: 'sub-equipo', icon: '👥', label: 'Team', tab: 'equipo' },
    { id: 'sub-reporte', icon: '💰', label: 'Report', tab: 'reporte' },
  ],
  medical: [
    { id: 'med-dash', icon: '📊', label: 'Dashboard', tab: 'dashboard' },
    { id: 'med-patients', icon: '👥', label: 'Patients', tab: 'pacientes' },
    { id: 'med-appointments', icon: '📅', label: 'Appointments', tab: 'citas' },
    { id: 'med-hipaa', icon: '🛡️', label: 'HIPAA', tab: 'hipaa' },
    { id: 'med-audit', icon: '📋', label: 'Audit Log', tab: 'audit' },
  ],
  research: [
    { id: 'res-dash', icon: '📊', label: 'Dashboard', tab: 'dashboard' },
    { id: 'res-leads', icon: '👥', label: 'Leads', tab: 'leads' },
    { id: 'res-newsletter', icon: '📧', label: 'Newsletter', tab: 'newsletter' },
    { id: 'res-sms', icon: '📱', label: 'SMS', tab: 'sms' },
    { id: 'res-mailing', icon: '📨', label: 'Mailing', tab: 'mailing' },
    { id: 'res-pipeline', icon: '🎯', label: 'Pipeline', tab: 'pipeline' },
    { id: 'res-opps', icon: '📋', label: 'Opportunities', tab: 'oportunidades' },
  ],
  // Dos secciones, cada una con sus sub-vistas en la barra horizontal (misma forma que
  // "Production" en mkt: `tab` apunta a la primera del grupo). Roles vive DENTRO de Usuarios:
  // es una faceta de la gestión de personas, no un par de Organización.
  admin: [
    { id: 'adm-usuarios', icon: '👥', label: 'Usuarios', tab: 'usuarios', tabs: ['usuarios', 'roles'] },
    { id: 'adm-org', icon: '🏛️', label: 'Organización', tab: 'empresas', tabs: ['empresas', 'departamentos', 'equipos', 'cargos', 'jornadas', 'vinculaciones'] },
  ],
}
