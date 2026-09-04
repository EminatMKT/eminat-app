import { MODULE, type ModuleSlug } from '@/shared/auth/permissions'
import type { PanelKey } from './tipos'

// Rail principal: NAV (tipado) filtrado por los `modules` del usuario en runtime.
export const NAV: { slug: ModuleSlug; key: string; icon: string; label: string; panel?: PanelKey }[] = [
  { slug: MODULE.TASKS, key: 'tasks', icon: '✅', label: 'Tasks', panel: 'tasks' },
  { slug: MODULE.STRATIX_MKT, key: 'mkt', icon: '🚀', label: 'Stratix 360', panel: 'mkt' },
  { slug: MODULE.ACCOUNTING, key: 'accounting', icon: '🧾', label: 'Accounting' },
  { slug: MODULE.COBRANZAS, key: 'cobranzas', icon: '💳', label: 'Billing' },
  { slug: MODULE.MEDICAL, key: 'medical', icon: '🏥', label: 'Medical', panel: 'medical' },
  { slug: MODULE.TH_HR, key: 'th-hr', icon: '👤', label: 'TH/HR' },
  { slug: MODULE.RESEARCH, key: 'research', icon: '🔬', label: 'Research', panel: 'research' },
  { slug: MODULE.DIRECTORIO, key: 'directorio', icon: '🏢', label: 'Directory' },
  { slug: MODULE.REUNIONES, key: 'reuniones', icon: '🗓️', label: 'Meetings' },
  { slug: MODULE.ADMIN, key: 'admin', icon: '🔐', label: 'Admin', panel: 'admin' },
]

// Título del topbar por módulo (el resto cae al fallback). ponytail: pendiente i18n (ver .todo).
export const AUTO_TITLE: Partial<Record<ModuleSlug, string>> = {
  [MODULE.TASKS]: 'Tasks — Tareas del grupo',
  [MODULE.STRATIX_MKT]: 'Stratix 360 — Marketing',
  [MODULE.ACCOUNTING]: 'Accounting — Eminat Research',
  [MODULE.COBRANZAS]: 'EMINAT LLC — Billing Dashboard',
  [MODULE.RESEARCH]: 'Eminat Research Group',
  [MODULE.MEDICAL]: 'Eminat Medical Center — HIPAA',
  [MODULE.DIRECTORIO]: 'Team Directory',
  [MODULE.REUNIONES]: 'Reuniones — Actas y pendientes',
  [MODULE.ADMIN]: 'Admin Panel',
}
