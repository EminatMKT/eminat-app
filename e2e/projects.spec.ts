import { test, expect } from '@playwright/test'
import { PASSWORD, ensureUser, getUsuario, deleteUser } from './seed'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
const SERVICE = process.env.SUPABASE_SECRET_KEY || ''
const MEMBER = 'projects-member@eminat.net'
const OUTSIDER = 'projects-outsider@eminat.net'
const ADMIN = 'freddy@eminat.net'

async function token(email: string) {
  const response = await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) })
  expect(response.ok).toBe(true)
  return (await response.json()).access_token as string
}

function rest(table: string, accessToken: string, method = 'GET', body?: unknown, query = '') {
  return fetch(`${URL}/rest/v1/${table}${query}`, { method, headers: { apikey: ANON, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined })
}

test('Projects RLS gives admin full access and workers only their memberships', async ({ page }) => {
  await ensureUser(ADMIN, 'admin', 'Freddy', 'Admin')
  await ensureUser(MEMBER, 'stratix360', 'Project', 'Member')
  await ensureUser(OUTSIDER, 'stratix360', 'Project', 'Outsider')
  const adminId = (await getUsuario(ADMIN)).id
  const memberId = (await getUsuario(MEMBER)).id
  const adminToken = await token(ADMIN)
  const memberToken = await token(MEMBER)
  const outsiderToken = await token(OUTSIDER)
  let projectId = ''

  try {
    const created = await rest('projects', adminToken, 'POST', { name: `E2E Project ${Date.now()}`, company_code: 'PREMIER', created_by: adminId, status: 'Planning' }, '?select=id,name')
    expect(created.status).toBe(201)
    const project = (await created.json())[0]
    projectId = project.id
    const membership = await rest('project_members', adminToken, 'POST', { project_id: projectId, user_id: memberId })
    expect(membership.status).toBe(201)

    const memberRead = await rest('projects', memberToken, 'GET', undefined, `?id=eq.${projectId}&select=id`)
    expect((await memberRead.json()).map((row: { id: string }) => row.id)).toEqual([projectId])
    const outsiderRead = await rest('projects', outsiderToken, 'GET', undefined, `?id=eq.${projectId}&select=id`)
    expect(await outsiderRead.json()).toEqual([])
    const outsiderMembers = await rest('project_members', outsiderToken, 'GET', undefined, `?project_id=eq.${projectId}&select=user_id`)
    expect(await outsiderMembers.json()).toEqual([])
    const outsiderStats = await rest('project_task_stats', outsiderToken, 'GET', undefined, `?project_id=eq.${projectId}&select=project_id`)
    expect(await outsiderStats.json()).toEqual([])
    const memberRole = await rest('project_members', memberToken, 'GET', undefined, `?project_id=eq.${projectId}&select=project_role`)
    expect((await memberRole.json())[0].project_role).toBe('Member')
    const deniedRole = await rest('project_members', memberToken, 'PATCH', { project_role: 'Project Lead' }, `?project_id=eq.${projectId}&user_id=eq.${memberId}`)
    expect(await deniedRole.json()).toEqual([])
    const adminRole = await rest('project_members', adminToken, 'PATCH', { project_role: 'Reviewer' }, `?project_id=eq.${projectId}&user_id=eq.${memberId}`)
    expect((await adminRole.json())[0].project_role).toBe('Reviewer')
    const workerWorkload = await rest('rpc/lilly_team_workload', memberToken, 'POST', {})
    expect(workerWorkload.status).toBeGreaterThanOrEqual(400)
    const adminWorkload = await rest('rpc/lilly_team_workload', adminToken, 'POST', {})
    expect(adminWorkload.status).toBe(200)
    const deniedUpdate = await rest('projects', memberToken, 'PATCH', { status: 'Archived' }, `?id=eq.${projectId}`)
    expect(await deniedUpdate.json()).toEqual([])
    expect((await rest('projects', outsiderToken, 'POST', { name: 'Denied', company_code: 'PREMIER', created_by: adminId })).status).toBeGreaterThanOrEqual(400)
    expect((await rest('project_members', outsiderToken, 'POST', { project_id: projectId, user_id: (await getUsuario(OUTSIDER)).id })).status).toBeGreaterThanOrEqual(400)

    // The first-visit tour covers module navigation; this test targets Projects.
    await page.addInitScript(() => localStorage.setItem('eminat-onboarding-completed', 'true'))
    await page.goto('/login')
    await page.getByPlaceholder('tu@eminat.net').fill(ADMIN)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.locator('input[type="password"]').press('Enter')
    await page.waitForURL('http://localhost:3000/', { timeout: 40000 })
    await expect(page.getByText('Home', { exact: true })).toBeVisible({ timeout: 20000 })
    await page.locator('[data-tour="tasks"]').click()
    await page.waitForURL('http://localhost:3000/tasks', { timeout: 40000 })
    await expect(page.getByRole('main').getByRole('button', { name: /Nueva tarea|New task/ })).toBeVisible({ timeout: 20000 })
    await page.getByRole('button', { name: /Projects|Proyectos/ }).click()
    await expect(page.getByRole('heading', { name: /Projects|Proyectos/ })).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(project.name)).toBeVisible()
    await page.getByRole('button', { name: new RegExp(project.name) }).click()
    const calendarRequest = page.waitForRequest(request => request.url().includes('/api/tasks/calendar?') && request.url().includes(`project=${projectId}`))
    await page.getByRole('navigation', { name: /Secciones del proyecto|Project sections/ }).getByRole('button', { name: /Calendario|Calendar/ }).click()
    await calendarRequest
    await expect(page.getByRole('grid')).toBeVisible()
    await page.getByRole('button', { name: /Semana|Week/ }).click()
    await expect(page.getByRole('gridcell')).toHaveCount(7)
    await page.getByRole('button', { name: /Hoy|Today/ }).click()
    await page.getByRole('navigation', { name: /Secciones del proyecto|Project sections/ }).getByRole('button', { name: /Equipo|Team/ }).click()
    await expect(page.getByText('Project Member')).toBeVisible()
    await expect(page.getByRole('combobox', { name: /Rol en el proyecto|Project role/ }).first()).toHaveValue('Reviewer')
    await page.getByRole('combobox', { name: /Agregar miembro|Add member/ }).selectOption((await getUsuario(OUTSIDER)).id)
    await page.getByRole('button', { name: /Agregar miembro|Add member/ }).click()
    await expect(page.getByText('Project Outsider')).toBeVisible()
    const outsiderMembership = await rest('project_members', adminToken, 'GET', undefined, `?project_id=eq.${projectId}&user_id=eq.${(await getUsuario(OUTSIDER)).id}&select=project_role`)
    expect((await outsiderMembership.json())[0].project_role).toBe('Member')
    await page.getByRole('button', { name: 'Project Outsider' }).locator('..').getByRole('button', { name: /Quitar|Remove/ }).click()
    await expect(page.getByRole('button', { name: 'Project Outsider' })).toHaveCount(0)
    const removedMembership = await rest('project_members', adminToken, 'GET', undefined, `?project_id=eq.${projectId}&user_id=eq.${(await getUsuario(OUTSIDER)).id}&select=user_id`)
    expect(await removedMembership.json()).toEqual([])
    await page.getByRole('complementary').getByRole('button', { name: /Team|Equipo/ }).click()
    await expect(page.getByRole('heading', { name: /Team|Equipo/ })).toBeVisible()
    await page.getByPlaceholder(/Buscar persona|Search people/).fill('Project Member')
    await expect(page.getByRole('button', { name: /Project Member/ })).toBeVisible()
    await page.getByRole('button', { name: /Project Member/ }).click()
    await expect(page.getByRole('heading', { name: 'Project Member' })).toBeVisible()
    await page.getByRole('navigation', { name: /Secciones del perfil|Profile sections/ }).getByRole('button', { name: /Projects|Proyectos/ }).click()
    await expect(page.getByText(project.name)).toBeVisible()
  } finally {
    if (projectId) await fetch(`${URL}/rest/v1/projects?id=eq.${projectId}`, { method: 'DELETE', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })
    await deleteUser(MEMBER)
    await deleteUser(OUTSIDER)
  }
})
