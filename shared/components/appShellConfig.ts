import type { ModuleSlug } from '@/shared/auth/permissions'

// Constantes dark del shell (sidebar + topbar, siempre oscuros).
export const D = {
  bg: '#0A0A0F',
  s1: '#111118',
  s2: '#1A1A24',
  border: 'rgba(255,255,255,0.07)',
  t1: '#FFFFFF',
  t2: 'rgba(255,255,255,0.6)',
  t3: 'rgba(255,255,255,0.3)',
}

export type SubItem = { id: string; icon: string; label: string; tab: string }
export type PanelKey = 'mkt' | 'medical' | 'research' | 'admin'

// Sub-tabs de los módulos con panel secundario.
export const SUB_ITEMS: Record<PanelKey, SubItem[]> = {
  mkt: [
    { id: 'sub-overview', icon: '📊', label: 'Dashboard', tab: 'overview' },
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
  // ponytail: panel de admin = imitación temporal del doble-uso de medical (decisión de UX pendiente, ver .todo)
  admin: [
    { id: 'adm-usuarios', icon: '👥', label: 'Usuarios', tab: 'usuarios' },
    { id: 'adm-roles', icon: '🔐', label: 'Roles', tab: 'roles' },
  ],
}

// Meta del panel secundario (título + subtítulo) y el módulo que lo gobierna.
export const PANEL_META: Record<PanelKey, { title: string; sub: string; slug: ModuleSlug }> = {
  mkt: { title: 'Stratix 360', sub: 'Marketing & Production', slug: 'stratix-mkt' },
  research: { title: 'Research', sub: 'Clinical Research Ops', slug: 'research' },
  medical: { title: 'Medical', sub: 'HIPAA Compliance', slug: 'medical' },
  admin: { title: 'Admin', sub: 'Usuarios y roles', slug: 'admin' },
}

// Rail principal: NAV (tipado) filtrado por los `modules` del usuario en runtime.
export const NAV: { slug: ModuleSlug; key: string; icon: string; label: string; panel?: PanelKey }[] = [
  { slug: 'stratix-mkt', key: 'mkt', icon: '🚀', label: 'Stratix 360', panel: 'mkt' },
  { slug: 'accounting', key: 'accounting', icon: '🧾', label: 'Accounting' },
  { slug: 'cobranzas', key: 'cobranzas', icon: '💳', label: 'Billing' },
  { slug: 'medical', key: 'medical', icon: '🏥', label: 'Medical', panel: 'medical' },
  { slug: 'th-hr', key: 'th-hr', icon: '👤', label: 'TH/HR' },
  { slug: 'research', key: 'research', icon: '🔬', label: 'Research', panel: 'research' },
  { slug: 'directorio', key: 'directorio', icon: '🏢', label: 'Directory' },
  { slug: 'admin', key: 'admin', icon: '🔐', label: 'Admin', panel: 'admin' },
]
