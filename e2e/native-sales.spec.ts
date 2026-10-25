import { randomUUID } from 'node:crypto'
import { test, expect, type Page } from '@playwright/test'
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
  await write('sales_organizations', 'POST', { id: organizationId, code: 'emc',
    name: 'Local EMC Commercial QA', status: 'active', approved_by: profile.id,
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

async function selectSales(page: Page, name: string) {
  if ((page.viewportSize()?.width ?? 1280) <= 768)
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await page.getByRole('navigation', { name: 'Sales sections' })
    .getByRole('link', { name, exact: true }).click()
}

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
  await selectSales(page, 'Social')
  await expect(page.getByRole('heading', { name: 'Conversations' })).toBeVisible()
  await expect(page.getByText('No permitted conversations yet.')).toBeVisible()
  await selectSales(page, 'Contacts')
  await expect(page).toHaveURL(/section=contacts/)
  await expect(page.getByRole('link', { name: 'Contacts', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Social', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Contacts', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Contacts', exact: true })).toBeVisible()
  await expect(page.locator('main nav')).toHaveCount(0)
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
  for (const label of ['Dashboard', 'Leads', 'Contacts', 'Accounts', 'Opportunities',
    'Pipeline', 'Activities', 'Memberships', 'Reports', 'Social', 'Sales Settings']) {
    await selectSales(page, label)
    await expect(page.getByRole('heading', { name: label, exact: true, level: 1 })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: /^Loading / })).toHaveCount(0)
    await expect(page.locator('main').getByRole('alert')).toHaveCount(0)
    const documentOverflows = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(documentOverflows, `${label} overflows the mobile viewport`).toBe(false)
  }
  expect(errors).toEqual([])
})

test('Sales defaults to its commercial workspace without exposing corporate memberships', async ({ page }) => {
  if (!['localhost','127.0.0.1'].includes(new URL(base).hostname))
    throw new Error('ORGANIZATION_REHEARSAL_REQUIRES_LOCAL_DATABASE')
  const secondOrg = randomUUID(), pendingOrg = randomUUID()
  const secondMember = randomUUID(), pendingMember = randomUUID()
  const firstLead = randomUUID(), secondLead = randomUUID()
  const profile = await getUsuario(email)
  const authId = await authIdByEmail(email)
  if (!profile?.id || !authId) throw new Error('LOCAL_SALES_IDENTITY_MISSING')
  try {
    for (const [id,name] of [[secondOrg,'Local Context Second'],[pendingOrg,'Local Context Pending']])
      await write('sales_organizations','POST',{ id,code:`qa-${id}`,name,status:'active',
        approved_by:profile.id,approved_at:new Date().toISOString() })
    for (const [id,org,status] of [[secondMember,secondOrg,'active'],[pendingMember,pendingOrg,'pending']])
      await write('sales_members','POST',{ id,organization_id:org,user_id:profile.id,auth_id:authId,
        role:'ADMINISTRATOR',status,evidence_ref:'local organization browser rehearsal',
        approved_by:profile.id,approved_at:new Date().toISOString() })
    for (const [id,org,owner,name] of [[firstLead,organizationId,memberId,'Context First Lead'],
      [secondLead,secondOrg,secondMember,'Context Second Lead']])
      await write('sales_leads','POST',{ id,organization_id:org,owner_member_id:owner,
        display_name:name,source:'Local QA',created_by:owner,updated_by:owner })
    await page.addInitScript(() => {
      localStorage.setItem('eminat-onboarding-completed','true')
      localStorage.setItem('locale','en')
    })
    await page.goto('/login')
    await page.getByPlaceholder('tu@eminat.net').fill(email)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.locator('input[type="password"]').press('Enter')
    await page.waitForURL('http://localhost:3000/',{ timeout:40000 })
    await page.goto('/sales-native')
    await expect(page.getByRole('heading',{ name:'Dashboard',exact:true })).toBeVisible()
    await expect(page.getByText('Corazón Salud / EMC Sales',{ exact:true })).toBeVisible()
    await expect(page.getByRole('button',{ name:'Open organization',exact:true })).toHaveCount(0)
    await expect(page.getByRole('combobox',{ name:'Sales organization',exact:true })).toHaveCount(0)
    await expect(page.getByRole('heading',{ name:'Select a Sales organization',exact:true })).toHaveCount(0)
    await expect(page.getByText('Local Context Second',{ exact:true })).toHaveCount(0)
    await selectSales(page, 'Leads')
    await expect(page.getByRole('button',{ name:/Context First Lead/ })).toBeVisible()
    await expect(page.getByRole('button',{ name:/Context Second Lead/ })).toHaveCount(0)
    await page.setViewportSize({ width:375,height:667 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth>window.innerWidth+1)).toBe(false)
    for (const id of [secondOrg, pendingOrg]) {
      await page.goto(`/sales-native?organization=${id}`)
      await expect(page.getByRole('navigation',{ name:'Sales sections' })).toHaveCount(0)
      await expect(page.getByText('This page could not be found.',{ exact:true })).toBeVisible()
    }
  } finally {
    await write('sales_leads','DELETE',undefined,`?id=in.(${firstLead},${secondLead})`)
    await write('sales_members','DELETE',undefined,`?id=in.(${secondMember},${pendingMember})`)
    await write('sales_organizations','DELETE',undefined,`?id=in.(${secondOrg},${pendingOrg})`)
  }
})

// Synthetic summary is confined to this local browser fixture; no Production data is fabricated.
test('Sales dashboard charts expose real response values, hover details and accessible data', async ({ page }) => {
  await page.route('**/api/sales-native/reports/summary', async route => {
    expect(route.request().headers()['x-sales-organization-id']).toBe(organizationId)
    await route.fulfill({ json: { data: {
      asOf: '2026-10-25', scope: 'organization',
      leads: { total: 3, byStatus: [{ code: 'NEW', count: 2 }, { code: 'ASSIGNED', count: 1 }] },
      opportunities: { total: 6, open: 3, won: 1, lost: 2, openByCurrency: [],
        byStage: [{ code: 'OPEN', label: 'Open', outcome: 'OPEN', count: 3 },
          { code: 'WON', label: 'Won', outcome: 'WON', count: 1 },
          { code: 'LOST', label: 'Lost', outcome: 'LOST', count: 2 }] },
    } } })
  })
  await page.addInitScript(() => {
    localStorage.setItem('eminat-onboarding-completed', 'true')
    localStorage.setItem('locale', 'en')
  })
  await page.goto('/login')
  await page.getByPlaceholder('tu@eminat.net').fill(email)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.locator('input[type="password"]').press('Enter')
  await page.waitForURL('http://localhost:3000/', { timeout: 40000 })
  await page.goto('/sales-native?section=dashboard')
  await expect(page.locator('.recharts-responsive-container')).toHaveCount(3)
  await page.locator('.recharts-bar-rectangle').first().hover()
  await expect(page.locator('.recharts-tooltip-wrapper').filter({ hasText: 'Records' }).first()).toBeVisible()
  await page.getByText('View chart data', { exact: true }).first().click()
  await expect(page.getByRole('row', { name: 'New 2', exact: true })).toBeVisible()
  await expect(page.getByRole('row', { name: 'Assigned 1', exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Sales sections' }).getByRole('link')).toHaveCount(13)
  await expect(page.locator('main nav')).toHaveCount(0)
})
