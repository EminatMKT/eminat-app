import { test, expect, Page } from '@playwright/test'
import { PASSWORD, ensureUser, getUsuario, authIdByEmail } from './seed'

// E2E de roles dinámicos. Serial: comparten estado en la DB local.
test.describe.configure({ mode: 'serial' })

const FREDDY = 'freddy@eminat.net'
const NUEVO = 'nuevo@eminat.net'
const CREADO = 'creado@eminat.net'
const BOOTSTRAP = 'bootstrap@eminat.net'
const ADMIN2 = 'admin2@eminat.net'

async function loginAs(page: Page, email: string) {
  await page.context().clearCookies()
  await page.goto('/login')
  try { await page.evaluate(() => localStorage.clear()) } catch {}
  await page.goto('/login')
  await page.getByPlaceholder('tu@eminat.net').fill(email)
  const pw = page.locator('input[type="password"]')
  await pw.fill(PASSWORD)
  await pw.press('Enter')
  await page.waitForURL('http://localhost:3000/', { timeout: 40000 })
  // Esperar a que loadProfile termine (sesión persistida) ANTES de navegar:
  // un fallo transitorio dispararía el signOut destructivo del AppContext.
  await expect(page.getByText('Home', { exact: true })).toBeVisible({ timeout: 20000 })
}

// Navegación client-side al panel admin (mantiene el provider montado → sin remount
// ni recarga de perfil, evita la carrera de sesión del goto de página completa).
async function openAdmin(page: Page) {
  await page.locator('[data-tour="admin"]').click()
  await page.waitForURL('**/admin')
  await page.locator('main').getByRole('button', { name: 'Roles', exact: true }).waitFor()
}

// Verifica Access denied en una ruta gateada. El goto de página completa remonta el
// provider y un loadProfile transitorio dispara el signOut destructivo (sticky). Por eso
// se re-loguea fresco en cada reintento de toPass: cada intento parte de sesión nueva.
async function assertDenied(page: Page, email: string, path: string) {
  await expect(async () => {
    await loginAs(page, email)
    await page.goto(path)
    await expect(page.getByText('Acceso denegado')).toBeVisible({ timeout: 8000 })
  }).toPass({ timeout: 45000, intervals: [500, 1500, 3000] })
}

// ── A. Gating ──────────────────────────────────────────────────────────────
test('A1 · admin ve módulos; Home no auto-abre submenú', async ({ page }) => {
  await loginAs(page, FREDDY)
  await expect(page.locator('[data-tour="admin"]')).toBeVisible()
  await expect(page.locator('[data-tour="directorio"]')).toBeVisible()
  await expect(page.getByText('Production', { exact: true })).toBeHidden()
})

test('A5 · sin_asignar: solo Home, módulos bloqueados', async ({ page }) => {
  await loginAs(page, NUEVO)
  await expect(page.locator('[data-tour="directorio"]')).toBeHidden()
  await expect(page.locator('[data-tour="admin"]')).toBeHidden()
  await assertDenied(page, NUEVO, '/stratix-mkt')
})

// ── A6. Alta de usuario por la API admin real ────────────────────────────────
test('A6 · admin crea usuario → 201, fila sin_asignar + su propio Auth', async ({ page }) => {
  await loginAs(page, FREDDY)
  // El email de bienvenida es best-effort: sin Resend en local devuelve 201 + emailWarning.
  const res = await page.request.post('/api/admin/create-user', {
    data: { email: CREADO, password: PASSWORD, nombre: 'Crea', apellido: 'Do' },
  })
  expect(res.status()).toBe(201)
  const { user } = await res.json()
  expect(user.rol).toBe('sin_asignar')             // DEFAULT_ROLE
  // fila usuarios sembrada y ligada a un auth user con el mismo id (creación atómica)
  const u = await getUsuario(CREADO)
  expect(u?.rol).toBe('sin_asignar')
  expect(await authIdByEmail(CREADO)).toBe(user.id)
  expect(u?.id).toBe(user.id)
})

test('A7 · reset-password de usuario sembrado (id≠auth) → 200', async ({ page }) => {
  await loginAs(page, FREDDY)
  // nuevo@ está sembrado por ensureUser: usuarios.id ≠ auth id (el auth id vive en
  // auth_id). El endpoint debe resolver el auth id por la fila, no asumir id=auth.
  // Reseteamos a la MISMA pass para no romper los loginAs(NUEVO) posteriores.
  const nuevo = await getUsuario(NUEVO)
  const res = await page.request.post('/api/admin/reset-password', { data: { userId: nuevo.id, password: PASSWORD } })
  expect(res.ok()).toBeTruthy()
})

// ── A2/A3/A4. CRUD de rol + efecto ───────────────────────────────────────────
test('A2 · crear rol "Soporte" con solo Directorio (modal)', async ({ page }) => {
  await loginAs(page, FREDDY)
  await openAdmin(page)
  await page.locator('main').getByRole('button', { name: 'Roles', exact: true }).click()
  await page.getByRole('button', { name: '+ Nuevo rol' }).click()
  await page.getByPlaceholder('Ej. Soporte').fill('Soporte')
  await page.getByRole('button', { name: 'Directorio', exact: true }).click()
  await page.getByRole('button', { name: 'Crear rol' }).click()
  await expect(page.getByTestId('role-soporte')).toBeVisible()
})

test('A3 · asignar rol Soporte a nuevo@ (dropdown de la fila)', async ({ page }) => {
  await loginAs(page, FREDDY)
  await openAdmin(page)
  const row = page.locator('tr', { hasText: NUEVO })
  await row.locator('select').selectOption({ label: 'Soporte' })
  await expect.poll(async () => (await getUsuario(NUEVO))?.rol, { timeout: 10000 }).toBe('soporte')
})

test('A4 · nuevo@ ahora ve solo Directorio', async ({ page }) => {
  await loginAs(page, NUEVO)
  await expect(page.locator('[data-tour="directorio"]')).toBeVisible()
  await expect(page.locator('[data-tour="admin"]')).toBeHidden()
  // Directorio accesible vía soft-nav (sin remount): click en el rail
  await page.locator('[data-tour="directorio"]').click()
  await page.waitForURL('**/directorio')
  await expect(page.getByText('Acceso denegado')).toBeHidden()
  // Stratix denegado (helper robusto con re-login)
  await assertDenied(page, NUEVO, '/stratix-mkt')
})

// ── B. Protección de roles ───────────────────────────────────────────────────
test('B6/B7 · admin sin botón borrar; sistema y rol-con-usuarios deshabilitados', async ({ page }) => {
  await loginAs(page, FREDDY)
  await openAdmin(page)
  await page.locator('main').getByRole('button', { name: 'Roles', exact: true }).click()
  await expect(page.getByTestId('del-admin')).toHaveCount(0)        // admin: ni botón
  await expect(page.getByTestId('del-sin_asignar')).toBeDisabled()  // sistema
  await expect(page.getByTestId('del-soporte')).toBeDisabled()      // tiene a nuevo@
})

test('B8 · POST /api/admin/roles como no-admin → 403', async ({ page }) => {
  await loginAs(page, NUEVO)
  const res = await page.request.post('/api/admin/roles', { data: { label: 'Hack', modules: [] } })
  expect(res.status()).toBe(403)
})

// ── C. Admins múltiples + guard de último admin ──────────────────────────────
test('C9/C10 · 2º admin independiente con su propio Auth', async ({ page }) => {
  await ensureUser(ADMIN2, 'admin', 'Admin', 'Dos')
  expect((await getUsuario(ADMIN2))?.rol).toBe('admin')
  await loginAs(page, ADMIN2)
  await expect(page.locator('[data-tour="admin"]')).toBeVisible()
  await openAdmin(page) // accede al panel admin sin Access denied
})

test('C11 · borrar al admin bootstrap no afecta a los demás', async ({ page }) => {
  await loginAs(page, ADMIN2)
  const bootId = (await getUsuario(BOOTSTRAP))!.id
  // flujo real: degradar primero (delete-user bloquea borrar admins), luego borrar
  const demote = await page.request.post('/api/admin/update-user', { data: { id: bootId, rol: 'sin_asignar' } })
  expect(demote.ok()).toBeTruthy()
  const del = await page.request.post('/api/admin/delete-user', { data: { id: bootId } })
  expect(del.ok()).toBeTruthy()
  expect(await getUsuario(BOOTSTRAP)).toBeNull()
  await openAdmin(page) // admin2 sigue funcionando
})

test('C12 · guard de último admin bloquea degradarlo', async ({ page }) => {
  await loginAs(page, ADMIN2)
  const freddyId = (await getUsuario(FREDDY))!.id
  const admin2Id = (await getUsuario(ADMIN2))!.id
  // quedan freddy + admin2; degradar a freddy se permite (admin2 sigue)
  const ok = await page.request.post('/api/admin/update-user', { data: { id: freddyId, rol: 'sin_asignar' } })
  expect(ok.ok()).toBeTruthy()
  // ahora admin2 es el único → degradarlo debe fallar
  const blocked = await page.request.post('/api/admin/update-user', { data: { id: admin2Id, rol: 'sin_asignar' } })
  expect(blocked.status()).toBe(400)
  expect((await blocked.json()).error).toContain('último admin')
})

// C13 (reassign-and-delete con dependencias) — no automatizado: requiere sembrar
// actividades/FKs; cubierto por el guard isLastAdmin (unit) + casos C11/C12.
