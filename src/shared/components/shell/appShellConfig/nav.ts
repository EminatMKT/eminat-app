import type { ModuleSlug } from '@/shared/auth/permissions'
import type { PanelKey } from './tipos'

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

// Título del topbar por módulo (el resto cae al fallback). ponytail: pendiente i18n (ver .todo).
export const AUTO_TITLE: Partial<Record<ModuleSlug, string>> = {
  'stratix-mkt': 'Stratix 360 — Producción',
  accounting: 'Accounting — Eminat Research',
  cobranzas: 'EMINAT LLC — Billing Dashboard',
  research: 'Eminat Research Group',
  medical: 'Eminat Medical Center — HIPAA',
  directorio: 'Team Directory',
  admin: 'Admin Panel',
}
