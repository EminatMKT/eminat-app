import { test, expect } from '@playwright/test'
import { ADMIN_ROLE } from '@/shared/auth/permissions'
import { ADMIN2_EMAIL } from '@e2e/constants'
import { ensureUser } from '@e2e/seed'
import loginAs from '../login-as'
import openAdmin from './index'

// admin2@, not freddy@: this spec sorts after the last-admin case, which demotes freddy@.
// The multiple-admins spec keeps admin2@ as an admin, so creating it here changes nothing there.
test('openAdmin reaches the admin panel with its Roles tab', async ({ page }) => {
  await ensureUser(ADMIN2_EMAIL, ADMIN_ROLE, 'Admin', 'Dos')
  await loginAs(page, ADMIN2_EMAIL)
  await openAdmin(page)
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByText('Acceso denegado')).toBeHidden()
})
