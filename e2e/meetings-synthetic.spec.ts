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
  titulo: `Actividad QA ${index + 1}`, descripcion: null,
  estado: index < 43 ? 'Pendiente' : index < 45 ? 'En proceso' : index < 47 ? 'Por aprobar' : 'Completado',
  responsable_id: index < 11 ? qaProfileId : 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  fecha_inicio: '2026-10-01', fecha_entrega: null, empresa: 'QA', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
  responsable: { id: qaProfileId, nombre: 'QA Meetings' }, equipo: null, departamento: null,
  meeting: { id: meetings[index % 9].id, title: meetings[index % 9].title, company: 'Empresa QA' },
  topic_id: `topic-${index + 1}`, related_to_viewer: true,
}))

test('canonical Meet UI displays 9 authorized meetings and 48 historically related Tasks with one LILLY session', async ({ page, context }) => {
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tasks, viewer: { profile_id: qaProfileId, equipo: null, empresa: { id: '11111111-1111-4111-8111-111111111111', codigo: 'QA', nombre: 'Empresa QA' } } }) })
  })

  await page.goto('/meetings')
  await expect(page.getByRole('heading', { name: 'Reuniones', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: /Reunión QA / })).toHaveCount(9)
  await expect(page.getByText('Reunión QA 9')).toBeVisible()
  await page.goto('/meetings/tasks')
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible()
  const taskCards = page.locator('article').filter({ hasText: 'Actividad QA' })
  await expect(page.getByRole('button', { name: 'Todas relacionadas conmigo' })).toBeVisible()
  await expect(taskCards).toHaveCount(48)
  await page.getByRole('button', { name: 'Mis Tasks' }).click()
  await expect(taskCards).toHaveCount(11)
  await page.getByRole('button', { name: 'Todas relacionadas conmigo' }).click()
  await expect(taskCards).toHaveCount(48)
  await page.getByRole('combobox', { name: 'Estado' }).selectOption('En proceso')
  await expect(taskCards).toHaveCount(2)
  await expect(taskCards.first()).toContainText('En proceso')
  await page.getByRole('combobox', { name: 'Estado' }).selectOption('Por aprobar')
  await expect(taskCards).toHaveCount(2)
  await page.getByRole('combobox', { name: 'Estado' }).selectOption('Completado')
  await expect(taskCards).toHaveCount(1)
  await page.getByRole('combobox', { name: 'Estado' }).selectOption('all')
  await expect(taskCards).toHaveCount(48)

  await page.route('**/api/integrations/meet/tasks', async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'TASK_API_ERROR', message: 'Tasks API unavailable' } }) })
  })
  await page.goto('/meetings')
  await expect(page.locator('.meet-module [role="alert"]')).toContainText('Tasks API unavailable')
  await expect(page.getByRole('heading', { level: 3, name: /Reunión QA / })).toHaveCount(9)
})
