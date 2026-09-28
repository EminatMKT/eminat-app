import { it, expect } from 'vitest'
import { MODULE, MODULE_META } from '@/shared/auth/permissions'
import { AUTO_TITLE } from './index'

// One screen, one name: the topbar reads the module's own name instead of a third spelling.
it('titles the billing topbar with the name of its module', () => {
  expect(AUTO_TITLE[MODULE.COBRANZAS]).toBe(MODULE_META[MODULE.COBRANZAS].name)
})
