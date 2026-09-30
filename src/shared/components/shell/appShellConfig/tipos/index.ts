import type { I18nKey } from '@/shared/i18n'

/** A sidebar sub-item. `tabs` groups a tab-bar under one item, active while the current tab is any
 *  member. `labelKey`, when set, is translated by `SidebarPanel` instead of `label` as-is, so a
 *  panel migrates to i18n one at a time. */
export type SubItem = {
  id: string
  icon: string
  label: string
  labelKey?: I18nKey
  tab: string
  tabs?: string[]
}

/** Which sidebar panel is open. */
export type PanelKey = 'tasks' | 'mkt' | 'medical' | 'research' | 'admin' | 'billing'

// The two shapes `SidebarPanel` reads to draw itself: which panels exist (`PanelKey`) and what
// each one's sub-items look like (`SubItem`). No behavior lives here — the data that uses these
// types is in the sibling files (`nav.ts`, `paneles.ts`, `subvistas.ts`).
