import { expect, test } from '@playwright/test'

const qaAuthId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const qaProfileId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const qaEmail = 'qa-meet@example.invalid'
const qaUser = { id: qaAuthId, email: qaEmail, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { full_name: 'QA Meetings' }, created_at: '2026-01-01T00:00:00Z' }
const meetings = Array.from({ length: 9 }, (_, index) => ({
  id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  user_id: index < 8 ? qaAuthId : 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  company_id: index < 8 ? '11111111-1111-4111-8111-111111111111' : '22222222-2222-4222-8222-222222222222',
  title: `Reunión QA ${index + 1}`,
  meeting_type: 'interna', objective: null, modality: 'virtual', location: null,
  meeting_date: '2026-10-01', start_time: '09:00:00', end_time: '10:00:00',
  participants: [], status: index === 8 ? 'finalizada' : 'activa',
  created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
  empresas: { nombre: index < 8 ? 'Empresa QA' : 'Empresa Invitada' },
}))
const tasks = Array.from({ length: 48 }, (_, index) => ({
  id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  titulo: `Actividad QA ${index + 1}`, descripcion: 'Texto relacionado clínico',
  estado: index < 43 ? 'Pendiente' : index < 45 ? 'En proceso' : index < 47 ? 'Por aprobar' : 'Completado',
  responsable_id: index < 11 ? qaProfileId : 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  fecha_inicio: '2026-10-01', fecha_entrega: null, empresa: 'QA', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
  responsable: { id: qaProfileId, nombre: 'QA Meetings' }, equipo: { id: 'qa-team', codigo: 'QA', nombre: 'Equipo QA' }, departamento: { id: 'qa-dept', codigo: 'QA', nombre: 'Departamento QA' },
  meeting: index < 6 ? null : { id: meetings[index % 9].id, title: meetings[index % 9].title, company: 'Empresa QA' },
  topic_id: index < 6 ? null : `topic-${index + 1}`, related_to_viewer: true,
}))

test('canonical Meet UI displays 9 authorized meetings and 48 historically related Tasks with one LILLY session', async ({ page, context }) => {
  const writes: string[] = []
  page.on('request', (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && (/\/rest\/v1\/(meetings|topics|actividades)(?:[?\/]|$)/.test(request.url()) || request.url().includes('/api/integrations/meet/'))) writes.push(request.url())
  })
  const exp = Math.floor(Date.now() / 1000) + 3600
  const jwt = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: qaAuthId, aud: 'authenticated', role: 'authenticated', exp })).toString('base64url')}.test-signature`
  const session = { access_token: jwt, refresh_token: 'qa-refresh', expires_at: exp, expires_in: 3600, token_type: 'bearer', user: qaUser }
  await context.addCookies([{ name: 'sb-example-auth-token', value: encodeURIComponent(JSON.stringify(session)), url: 'http://localhost:3000' }])

  await page.route('https://example.supabase.co/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname === '/auth/v1/user') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(qaUser) })
      return
    }
    if (url.pathname.startsWith('/auth/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) })
      return
    }
    const table = url.pathname.split('/').at(-1)
    let rows: unknown[] = []
    if (table === 'usuarios') rows = [{ id: qaProfileId, auth_id: qaAuthId, email: qaEmail, nombre: 'QA', apellido: 'Meetings', rol: 'qa_role', activo: true, empresa_id: '11111111-1111-4111-8111-111111111111' }]
    if (table === 'roles') rows = [{ key: 'qa_role', label: 'QA Meetings' }]
    if (table === 'role_modules') rows = [{ role_key: 'qa_role', module_slug: 'reuniones' }, { role_key: 'qa_role', module_slug: 'tasks' }]
    if (table === 'meetings') rows = meetings
    const single = request.headers()['accept']?.includes('vnd.pgrst.object')
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? rows[0] ?? null : rows) })
  })
  await page.route('**/api/integrations/meet/tasks', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tasks, viewer: { profile_id: qaProfileId, equipo: { id: 'qa-team', nombre: 'Equipo QA' }, empresa: { id: '11111111-1111-4111-8111-111111111111', codigo: 'QA', nombre: 'Empresa QA' } } }) })
  })

  await page.route('**/api/ui-time', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ utcMs: Date.parse('2026-07-01T12:00:00Z') }) }))
  await page.route('**/api/integrations/meet/task-catalogs', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ companies: [{ id: '11111111-1111-4111-8111-111111111111', codigo: 'QA', nombre: 'Empresa QA' }], departments: [], teams: [], states: [] }) }))
  await page.goto('/meetings')
  await expect(page.getByRole('heading', { name: 'Reuniones', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: /Reunión QA / })).toHaveCount(9)
  await expect(page.getByText('Reunión QA 9')).toBeVisible()
  const clocks = page.getByRole('group', { name: 'Horas mundiales' })
  await expect(clocks).toHaveAttribute('data-time-source', 'server')
  await expect(clocks.locator('time')).toHaveCount(7)
  for (const [zone, value] of Object.entries({ 'America/New_York': '8:00 AM', 'Europe/Madrid': '2:00 PM', 'America/Guayaquil': '7:00 AM', 'America/Caracas': '8:00 AM', 'America/Costa_Rica': '6:00 AM', 'America/Havana': '8:00 AM', 'America/Mexico_City': '6:00 AM' })) {
    await expect(clocks.locator(`[data-timezone="${zone}"]`)).toHaveText(value)
  }
  await expect(page.getByRole('button', { name: 'EMINAT', exact: true })).toHaveCount(0)
  const sampledTime = await clocks.locator('time').first().getAttribute('datetime')
  await expect.poll(() => clocks.locator('time').first().getAttribute('datetime')).not.toBe(sampledTime)
  await page.screenshot({ path: test.info().outputPath('meetings-desktop.png'), fullPage: false })
  await page.goto('/meetings/new')
  await expect(page.getByRole('heading', { name: 'Nueva reunión' })).toBeVisible()
  await expect(page.locator('#onboarding-mask')).toHaveCount(0)
  const row = page.locator(`[data-invitee-id="${qaProfileId}"]`)
  await expect(row).toBeVisible()
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
  await row.hover()
  await expect(row).toHaveCSS('background-color', 'rgb(243, 244, 246)')
  await expect(row.locator('span').first()).toHaveCSS('color', 'rgb(17, 24, 39)')
  const checkbox = page.getByRole('checkbox', { name: 'QA Meetings' })
  await checkbox.check()
  await expect(row).toHaveAttribute('data-selected', 'true')
  await expect(page.getByText('1 convocados', { exact: true })).toBeVisible()
  await expect(checkbox).toHaveCSS('color-scheme', 'light')
  await page.screenshot({ path: test.info().outputPath('meetings-new-light.png'), fullPage: true })
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await expect(row.locator('span').first()).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(checkbox).toHaveCSS('color-scheme', 'dark')
  await checkbox.uncheck()
  await expect(row).toHaveAttribute('data-selected', 'false')
  await expect(page.getByText('0 convocados', { exact: true })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('meetings-new-dark.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('textbox', { name: 'Buscar por nombre…' }).fill('missing')
  await expect(row).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Buscar por nombre…' }).fill('QA')
  await expect(row).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('meetings-new-mobile.png'), fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await expect(page.locator('main button').filter({ hasText: 'Reuniones' }).filter({ hasText: 'Abrir' })).toContainText('🗓️')
  await expect(page.locator('main button').filter({ hasText: 'Tasks' }).filter({ hasText: 'Abrir' })).toContainText('✅')
  await page.screenshot({ path: test.info().outputPath('home-icons.png'), fullPage: false })
  await page.goto('/meetings/tasks')
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible()
  await expect(page.getByText('Las Tasks se administran en el módulo Tasks de LILLY. Meetings solo las muestra.', { exact: true })).toBeVisible()
  await expect(page.locator('main')).not.toContainText('StratixCRM')
  const taskCards = page.locator('article').filter({ hasText: 'Actividad QA' })
  await expect(page.getByRole('button', { name: 'Todas relacionadas conmigo' })).toBeVisible()
  await expect(taskCards).toHaveCount(48)
  await page.getByRole('button', { name: 'Mis Tasks' }).click()
  await expect(taskCards).toHaveCount(11)
  await page.getByRole('button', { name: 'Todas relacionadas conmigo' }).click()
  await expect(taskCards).toHaveCount(48)
  await page.getByRole('combobox', { name: 'Estado' }).selectOption('Pendiente')
  await expect(taskCards).toHaveCount(43)
  await page.getByRole('combobox', { name: 'Estado' }).selectOption('En proceso')
  await expect(taskCards).toHaveCount(2)
  await expect(taskCards.first()).toContainText('En proceso')
  await page.getByRole('combobox', { name: 'Estado' }).selectOption('Por aprobar')
  await expect(taskCards).toHaveCount(2)
  await page.getByRole('combobox', { name: 'Estado' }).selectOption('Completado')
  await expect(taskCards).toHaveCount(1)
  await page.getByRole('combobox', { name: 'Estado' }).selectOption('all')
  await expect(taskCards).toHaveCount(48)

  await expect(page.locator('#onboarding-mask')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('eminat-onboarding-completed'))).toBeNull()
  const search = page.getByRole('searchbox')
  for (const scope of ['Todas relacionadas conmigo', 'Todas visibles', 'Mis Tasks', 'Mi equipo', 'Mi empresa']) {
    await page.getByRole('button', { name: scope, exact: true }).click()
    await search.fill('Actividad QA 48')
    await expect(taskCards).toHaveCount(scope === 'Mis Tasks' ? 0 : 1)
    await search.fill('')
    await expect(taskCards).toHaveCount(scope === 'Mis Tasks' ? 11 : 48)
  }
  await page.getByRole('button', { name: 'Todas relacionadas conmigo', exact: true }).click()
  for (const query of ['QA Meetings', 'QA', 'Reunión QA 9']) {
    await search.fill(query)
    await expect(taskCards).toHaveCount(query === 'Reunión QA 9' ? 8 : 48)
  }
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click()
  await expect(taskCards).toHaveCount(48)
  for (const task of tasks.slice(0, 6)) await expect(page.locator(`[data-task-id="${task.id}"]`)).toHaveCount(1)
  // OS preference must not override LILLY's selected content theme.
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
  await expect(taskCards.first()).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(taskCards.first().getByRole('heading')).toHaveCSS('color', 'rgb(17, 24, 39)')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await expect(taskCards.first()).toHaveCSS('background-color', 'rgb(19, 19, 28)')
  await expect(taskCards.first().getByRole('heading')).toHaveCSS('color', 'rgb(255, 255, 255)')
  await page.screenshot({ path: test.info().outputPath('meetings-tasks-dark.png'), fullPage: false })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.locator('.meet-module').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('meetings-tasks-mobile.png'), fullPage: false })
  await page.goto('/meetings/history')
  const historySearch = page.getByRole('searchbox')
  await expect(page.locator('[data-task-id]')).toHaveCount(42)
  for (const query of ['Actividad QA 48', 'QA Meetings', 'Empresa QA', 'Reunión QA 9', 'clinico']) {
    await historySearch.fill(query)
    await expect(page.locator('[data-task-id]')).toHaveCount(query === 'Actividad QA 48' ? 1 : query === 'Reunión QA 9' ? 8 : 42)
  }
  await historySearch.fill('no-match')
  await expect(page.locator('[data-task-id]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click()
  await expect(page.locator('[data-task-id]')).toHaveCount(42)

  await page.screenshot({ path: test.info().outputPath('meetings-history.png'), fullPage: false })
  expect(writes).toEqual([])

  // A unavailable time service preserves seven working clocks, and a later valid UTC sample recovers.
  await page.route('**/api/ui-time', route => route.fulfill({ status: 503, body: '{}' }))
  await page.goto('/meetings')
  await expect(clocks).toHaveAttribute('data-time-source', 'device')
  await expect(clocks.locator('time')).toHaveCount(7)
  await expect(clocks.locator('time').first()).toHaveText(/\d{1,2}:\d{2} [AP]M/)
  await page.route('**/api/ui-time', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ utcMs: Date.parse('2026-07-01T12:42:00Z') }) }))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(clocks).toHaveAttribute('data-time-source', 'server')
  await expect(clocks.locator('time').first()).toHaveText('8:42 AM')
  expect(writes).toEqual([])

  await page.route('**/api/integrations/meet/tasks', async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'TASK_API_ERROR', message: 'Tasks API unavailable' } }) })
  })
  await page.goto('/meetings')
  await expect(page.locator('.meet-module [role="alert"]')).toContainText('Tasks API unavailable')
  await expect(page.getByRole('heading', { level: 3, name: /Reunión QA / })).toHaveCount(9)
})
