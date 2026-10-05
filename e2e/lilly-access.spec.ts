import { test, expect } from '@playwright/test'
import { PASSWORD, H, ensureUser, getUsuario, deleteUser } from './seed'
import { URL, ANON } from './constants'

// This runs against the disposable Supabase stack in CI. It turns enforcement on
// only for this test and restores the switch before other specs use the database.
const emails = {
  finance: 'lilly.finance.e2e@eminat.net',
  stratix: 'lilly.stratix.e2e@eminat.net',
  medical: 'lilly.medical.e2e@eminat.net',
  cross: 'lilly.cross.e2e@eminat.net',
}

async function service(table: string, method = 'GET', data?: unknown, query = '') {
  const response = await fetch(`${URL}/rest/v1/${table}${query}`, {
    method, headers: { ...H, Prefer: 'return=representation' },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  if (!response.ok) throw new Error(`${method} ${table}: ${response.status} ${await response.text()}`)
  return response.status === 204 ? [] : response.json()
}

async function token(email: string) {
  const response = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  expect(response.ok).toBe(true)
  return (await response.json()).access_token as string
}

async function asUser(table: string, jwt: string, query = '') {
  const response = await fetch(`${URL}/rest/v1/${table}${query}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}` },
  })
  if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`)
  return response.json()
}

test('RLS confines companies, people and Projects while allowing one shared Project', async ({ page }) => {
  const admin = await getUsuario('freddy@eminat.net')
  expect(admin?.id).toBeTruthy()
  const createdTaskIds: string[] = []
  const createdProjectIds: string[] = []
  const addedModules: string[] = []
  let addedStratixCompany = false

  try {
    const existingS = await service('empresas', 'GET', undefined, '?codigo=eq.S&select=codigo')
    if (existingS.length === 0) {
      await service('empresas', 'POST', { codigo: 'S', nombre: 'Stratix test', color: '#4F46E5', activo: true })
      addedStratixCompany = true
    }
    for (const role of ['finanzas', 'medico_investigacion']) {
      const existing = await service('role_modules', 'GET', undefined,
        `?role_key=eq.${role}&module_slug=eq.tasks&select=role_key`)
      if (existing.length === 0) {
        await service('role_modules', 'POST', { role_key: role, module_slug: 'tasks' })
        addedModules.push(role)
      }
    }
    await ensureUser(emails.finance, 'finanzas', 'Finance', 'Scope')
    await ensureUser(emails.stratix, 'stratix360', 'Stratix', 'Scope')
    await ensureUser(emails.medical, 'medico_investigacion', 'Medical', 'Scope')
    await ensureUser(emails.cross, 'stratix360', 'Cross', 'Project')
    const ids = Object.fromEntries(await Promise.all(
      Object.entries(emails).map(async ([key, email]) => [key, (await getUsuario(email)).id]),
    )) as Record<keyof typeof emails, string>
    for (const [key, company] of [
      ['finance', 'EMINAT'], ['stratix', 'S'], ['medical', 'EMC'],
      ['medical', 'ERG'], ['cross', 'S'],
    ] as const) {
      await service('usuario_empresas_acceso', 'POST', {
        usuario_id: ids[key], empresa_codigo: company, created_by: admin.id,
      })
    }
    const day = new Date().toISOString().slice(0, 10)
    const adminJwt = await token('freddy@eminat.net')
    const makeProject = async (company: string) => {
      const [row] = await service('projects', 'POST', {
        name: `LILLY access ${company} ${Date.now()}`, company_code: company,
        created_by: admin.id, status: 'Planning', start_date: day, target_date: day,
      }, '?select=id')
      createdProjectIds.push(row.id)
      return row.id as string
    }
    const makeTask = async (company: string, projectId?: string) => {
      // The Project link trigger deliberately checks the caller's admin session,
      // even for service_role. Create linked Tasks with a real admin JWT.
      const response = await fetch(`${URL}/rest/v1/actividades?select=id`, {
        method: 'POST',
        headers: {
          apikey: ANON, Authorization: `Bearer ${adminJwt}`,
          'Content-Type': 'application/json', Prefer: 'return=representation',
        },
        body: JSON.stringify({
        titulo: `LILLY scope ${company} ${Date.now()}`, empresa: company,
        estado: 'Pendiente', fecha_inicio: day, fecha_entrega: day,
        created_by_id: admin.id, project_id: projectId ?? null,
        }),
      })
      if (!response.ok) throw new Error(`POST actividades: ${response.status} ${await response.text()}`)
      const [row] = await response.json()
      createdTaskIds.push(row.id)
      return row.id as string
    }
    const eminatTask = await makeTask('EMINAT')
    const stratixTask = await makeTask('S')
    const emcProject = await makeProject('EMC')
    const otherEmcProject = await makeProject('EMC')
    const emcTask = await makeTask('EMC', emcProject)
    const otherEmcTask = await makeTask('EMC', otherEmcProject)
    const ergTask = await makeTask('ERG')
    await service('project_members', 'POST', { project_id: emcProject, user_id: ids.cross })
    // A historical assignment by itself must not grant company visibility.
    await service('actividad_responsables', 'POST',
      { actividad_id: emcTask, usuario_id: ids.cross, es_lider: true })
    await service('actividad_responsables', 'POST',
      { actividad_id: otherEmcTask, usuario_id: ids.cross, es_lider: true })
    await service('lilly_access_control', 'PATCH', { enforced: true }, '?singleton=eq.true')

    const jwt = Object.fromEntries(await Promise.all([
      ['admin', 'freddy@eminat.net'], ...Object.entries(emails),
    ].map(async ([key, email]) => [key, await token(email)]))) as Record<string, string>
    const visibleTasks = async (who: string) => new Set((await asUser(
      'actividades', jwt[who], `?id=in.(${createdTaskIds.join(',')})&select=id`,
    )).map((row: { id: string }) => row.id))
    expect(await visibleTasks('admin')).toEqual(new Set(createdTaskIds))
    expect(await visibleTasks('finance')).toEqual(new Set([eminatTask]))
    expect(await visibleTasks('stratix')).toEqual(new Set([stratixTask]))
    expect(await visibleTasks('medical')).toEqual(new Set([emcTask, otherEmcTask, ergTask]))
    expect(await visibleTasks('cross')).toEqual(new Set([stratixTask, emcTask]))

    // Manual REST filters cannot disclose another company's rows.
    expect(await asUser('actividades', jwt.finance, '?empresa=eq.EMC&select=id')).toEqual([])
    expect(await asUser('projects', jwt.cross,
      `?id=in.(${createdProjectIds.join(',')})&select=id`)).toEqual([{ id: emcProject }])
    const crossCompanies = (await asUser('empresas', jwt.cross, '?select=codigo'))
      .map((row: { codigo: string }) => row.codigo)
    expect(crossCompanies).toContain('S')
    expect(crossCompanies).toContain('EMC')
    expect(crossCompanies).not.toContain('ERG')
    const financeUsers = (await asUser('usuarios', jwt.finance,
      `?id=in.(${Object.values(ids).join(',')})&select=id`)).map((row: { id: string }) => row.id)
    expect(financeUsers).toEqual([ids.finance])

    await page.goto('/login')
    await page.getByPlaceholder('tu@eminat.net').fill(emails.cross)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.locator('input[type="password"]').press('Enter')
    await page.waitForURL('http://localhost:3000/', { timeout: 40000 })
    const calendar = await page.request.get(`/api/tasks/calendar?start=${day}&end=${day}&company=EMC`)
    expect(calendar.status()).toBe(200)
    expect((await calendar.json()).tasks.map((row: { id: string }) => row.id))
      .toEqual([emcTask])
    const deniedProject = await page.request.get(
      `/api/tasks/calendar?start=${day}&end=${day}&project=${otherEmcProject}`)
    expect(deniedProject.status()).toBe(404)
    const deniedReport = await page.request.get(`/api/tasks/report?user=${ids.medical}`)
    expect(deniedReport.status()).toBe(403)
    const ownReport = await page.request.get(`/api/tasks/report?user=${ids.cross}`)
    expect(ownReport.status()).toBe(200)
    expect((await ownReport.json()).tasks.map((row: { id: string }) => row.id))
      .toEqual([emcTask])
  } finally {
    await service('lilly_access_control', 'PATCH', { enforced: false }, '?singleton=eq.true')
    for (const id of createdTaskIds) await service('actividades', 'DELETE', undefined, `?id=eq.${id}`)
    for (const id of createdProjectIds) await service('projects', 'DELETE', undefined, `?id=eq.${id}`)
    for (const email of Object.values(emails)) await deleteUser(email)
    for (const role of addedModules) await service('role_modules', 'DELETE', undefined,
      `?role_key=eq.${role}&module_slug=eq.tasks`)
    if (addedStratixCompany) await service('empresas', 'DELETE', undefined, '?codigo=eq.S')
  }
})
