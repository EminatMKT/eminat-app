import { test, expect } from '@playwright/test'
import { DEFAULT_ROLE } from '@/shared/auth/permissions'
import { CREADO_EMAIL, FREDDY_EMAIL, NUEVO_EMAIL } from '@e2e/constants'
import { PASSWORD, authIdByEmail, getUsuario } from '@e2e/seed'
import loginAs from '../login-as'

const SERIAL = { mode: 'serial' } as const
const CREATE_USER = '/api/admin/create-user'
const RESET_PASSWORD = '/api/admin/reset-password'
const NEW_USER = {
  email: CREADO_EMAIL,
  password: PASSWORD,
  nombre: 'Crea',
  apellido: 'Do',
}

// User creation and password reset through the real admin API. Runs before 4-multiple-admins,
// which demotes freddy@.
test.describe.configure(SERIAL)

test('A6 · admin creates a user → 201, sin_asignar row + its own Auth', async ({ page }) => {
  await loginAs(page, FREDDY_EMAIL)
  // The welcome email is best-effort: without Resend locally it answers 201 + emailWarning.
  const created = { data: NEW_USER }
  const res = await page.request.post(CREATE_USER, created)
  expect(res.status()).toBe(201)
  const { user } = await res.json()
  expect(user.rol).toBe(DEFAULT_ROLE)
  // The usuarios row is seeded and tied to an auth user with the same id (atomic creation).
  const u = await getUsuario(CREADO_EMAIL)
  expect(u?.rol).toBe(DEFAULT_ROLE)
  expect(await authIdByEmail(CREADO_EMAIL)).toBe(user.id)
  expect(u?.id).toBe(user.id)
})

test('A7 · reset-password of a seeded user (id≠auth) → 200', async ({ page }) => {
  await loginAs(page, FREDDY_EMAIL)
  // nuevo@ is seeded by ensureUser: usuarios.id ≠ auth id (that one lives in auth_id), so the
  // endpoint must resolve the auth id from the row. Reset to the SAME password so later
  // loginAs(nuevo@) calls keep working.
  const nuevo = await getUsuario(NUEVO_EMAIL)
  const reset = { data: { userId: nuevo.id, password: PASSWORD } }
  const res = await page.request.post(RESET_PASSWORD, reset)
  expect(res.ok()).toBeTruthy()
})
