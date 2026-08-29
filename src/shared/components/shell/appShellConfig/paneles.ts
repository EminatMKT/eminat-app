import type { ModuleSlug } from '@/shared/auth/permissions'
import type { PanelKey } from './tipos'

// Meta del panel secundario (título + subtítulo) y el módulo que lo gobierna.
export const PANEL_META: Record<PanelKey, { title: string; sub: string; slug: ModuleSlug }> = {
  mkt: { title: 'Stratix 360', sub: 'Marketing & Production', slug: 'stratix-mkt' },
  research: { title: 'Research', sub: 'Clinical Research Ops', slug: 'research' },
  medical: { title: 'Medical', sub: 'HIPAA Compliance', slug: 'medical' },
  admin: { title: 'Admin', sub: 'Usuarios, roles y organización', slug: 'admin' },
}
