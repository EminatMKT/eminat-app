import type { PanelKey, SubItem } from './tipos'

// Sub-tabs de los módulos con panel secundario.
export const SUB_ITEMS: Record<PanelKey, SubItem[]> = {
  // Las cuatro secciones de tareas, con los MISMOS ids de tab que en Stratix: durante la fase 2
  // las dos rutas montan las mismas vistas y una tab que no coincidiera abriría en blanco.
  tasks: [
    { id: 'tasks-dash', icon: '📊', label: 'Dashboard', tab: 'overview' },
    { id: 'tasks-prod', icon: '⚡', label: 'Production', tab: 'kanban' },
    { id: 'tasks-sol', icon: '📋', label: 'Requests', tab: 'solicitudes' },
    { id: 'tasks-rep', icon: '💰', label: 'Report', tab: 'reporte' },
  ],
  // Lo que le queda a Stratix con las tareas afuera: marketing propiamente dicho. Las cuatro
  // secciones que faltan —Dashboard, Production, Requests, Report— viven en `tasks`.
  mkt: [
    { id: 'sub-social', icon: '📱', label: 'Social Media', tab: 'social' },
    { id: 'sub-competencia', icon: '🎯', label: 'Competitors', tab: 'competencia' },
    { id: 'sub-equipo', icon: '👥', label: 'Team', tab: 'equipo' },
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
