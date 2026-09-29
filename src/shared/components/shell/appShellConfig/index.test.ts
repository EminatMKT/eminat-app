import { it, expect } from 'vitest'
import { MODULE, MODULE_META } from '@/shared/auth/permissions'
import { AUTO_TITLE, SUB_ITEMS, PANEL_META } from './index'

// One screen, one name: the topbar reads the module's own name instead of a third spelling.
it('titles the billing topbar with the name of its module', () => {
  expect(AUTO_TITLE[MODULE.COBRANZAS]).toBe(MODULE_META[MODULE.COBRANZAS].name)
})

// The billing panel offers Overview before Records, each translated by its own key.
it('gives billing two sub-items, both translated through labelKey', () => {
  expect(SUB_ITEMS.billing.map(item => item.tab)).toEqual(['overview', 'records'])
  expect(SUB_ITEMS.billing.every(item => item.labelKey)).toBe(true)
})

it('names the billing panel after the cobranzas module', () => {
  expect(PANEL_META.billing.slug).toBe(MODULE.COBRANZAS)
})
