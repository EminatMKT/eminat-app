import { test } from '@playwright/test'
import { MODULE, modulePath } from '@/shared/auth/permissions'
import { NUEVO_EMAIL } from '@e2e/constants'
import assertDenied from './index'

// nuevo@ never gets Stratix: it starts `sin_asignar` and the role CRUD only gives it Directorio.
test('assertDenied passes on a route the user cannot open', async ({ page }) => {
  await assertDenied(page, NUEVO_EMAIL, modulePath(MODULE.STRATIX_MKT))
})
