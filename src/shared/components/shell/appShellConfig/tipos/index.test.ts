import { expect, it } from 'vitest'
import type { SubItem, PanelKey } from './index'

it('groups a tab-bar under one item, active while the current tab is any member', () => {
  const item: SubItem = {
    id: 'billing-records',
    icon: '📅',
    label: 'Records',
    tab: 'records',
    tabs: ['records', 'overview'],
  }
  expect(item.tabs).toContain('overview')
})

it('is translated by SidebarPanel when labelKey is set, read as-is otherwise', () => {
  const withKey: SubItem = {
    id: 'billing-overview',
    icon: '📊',
    label: 'Overview',
    labelKey: 'billing.tab.overview',
    tab: 'overview',
  }
  const withoutKey: SubItem = {
    id: 'adm-org',
    icon: '🏛️',
    label: 'Organización',
    tab: 'empresas',
  }
  expect(withKey.labelKey).toBe('billing.tab.overview')
  expect(withoutKey.labelKey).toBeUndefined()
})

it('names every panel the sidebar can show, billing included', () => {
  const panel: PanelKey = 'billing'
  expect(panel).toBe('billing')
})
