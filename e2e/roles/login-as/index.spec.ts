import { test, expect } from '@playwright/test'
import { NUEVO_EMAIL } from '@e2e/constants'
import loginAs from './index'

const HOME_PATH = '/'

test('loginAs lands on Home with the profile loaded', async ({ page }) => {
  await loginAs(page, NUEVO_EMAIL)
  await expect(page).toHaveURL(HOME_PATH)
  await expect(page.getByText('Home', { exact: true })).toBeVisible()
})
