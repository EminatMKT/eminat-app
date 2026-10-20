import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { H, PASSWORD, authIdByEmail, deleteUser, ensureUser, getUsuario } from './seed'

const base = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const email = 'native-sales-qa@eminat.net'
const organizationId = randomUUID()
const memberId = randomUUID()

async function write(table: string, method: 'POST' | 'DELETE', body?: object, query = '') {
  const response = await fetch(`${base}/rest/v1/${table}${query}`, {
    method, headers: { ...H, Prefer: 'return=minimal' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`LOCAL_SALES_FIXTURE_${table}_${response.status}`)
}

test.beforeAll(async () => {
  const authId = await ensureUser(email, 'admin', 'QA', 'Sales')
  const profile = await getUsuario(email)
  if (!profile?.id || authId !== await authIdByEmail(email)) throw new Error('LOCAL_SALES_IDENTITY_MISSING')
  await write('sales_organizations', 'POST', { id: organizationId, code: `qa-${organizationId}`,
    name: 'Local Sales QA', status: 'active', approved_by: profile.id,
    approved_at: new Date().toISOString() })
  await write('sales_members', 'POST', { id: memberId, organization_id: organizationId,
    user_id: profile.id, auth_id: authId, role: 'SUPERADMIN', status: 'active',
    evidence_ref: 'local browser QA fixture', approved_by: profile.id,
    approved_at: new Date().toISOString() })
})

test.afterAll(async () => {
  await write('sales_members', 'DELETE', undefined, `?id=eq.${memberId}`)
  await write('sales_organizations', 'DELETE', undefined, `?id=eq.${organizationId}`)
  await deleteUser(email)
})

test('native Sales loads from LILLY identity with a scoped Social inbox', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  // The first-visit tour is tested separately; its mask covers Sales navigation.
  await page.addInitScript(() => {
    localStorage.setItem('eminat-onboarding-completed', 'true')
    localStorage.setItem('locale', 'en')
  })
  await page.goto('/login')
  await page.getByPlaceholder('tu@eminat.net').fill(email)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.locator('input[type="password"]').press('Enter')
  await page.waitForURL('http://localhost:3000/', { timeout: 40000 })
  await page.goto('/sales-native')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: 'Social', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Conversations' })).toBeVisible()
  await expect(page.getByText('No permitted conversations yet.')).toBeVisible()
  expect(errors).toEqual([])
})

test('native Sales sections render at mobile width without document overflow', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 375, height: 667 })
  await page.addInitScript(() => {
    localStorage.setItem('eminat-onboarding-completed', 'true')
    localStorage.setItem('locale', 'en')
  })
  await page.goto('/login')
  await page.getByPlaceholder('tu@eminat.net').fill(email)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.locator('input[type="password"]').press('Enter')
  await page.waitForURL('http://localhost:3000/', { timeout: 40000 })
  await page.goto('/sales-native')
  const sections = page.getByRole('navigation', { name: 'Sales sections' })
  for (const label of ['Dashboard', 'Leads', 'Contacts', 'Accounts', 'Opportunities',
    'Pipeline', 'Activities', 'Memberships', 'Reports', 'Social', 'Sales Settings']) {
    await sections.getByRole('button', { name: label, exact: true }).click()
    await expect(page.getByRole('heading', { name: label, exact: true, level: 1 })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: /^Loading / })).toHaveCount(0)
    await expect(page.locator('main').getByRole('alert')).toHaveCount(0)
    const documentOverflows = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(documentOverflows, `${label} overflows the mobile viewport`).toBe(false)
  }
  expect(errors).toEqual([])
})
