import { test, expect } from '@playwright/test'
import { PASSWORD, getUsuario, authIdByEmail } from './seed'
import ui from './ui'

// Las dos rutas de la API admin que tocan el Auth de un usuario: crearlo y resetearle la clave.
// Vive aparte de `roles.spec.ts` —que prueba gating, no altas— y de `roles-admins.spec.ts`.
test.describe.configure({ mode: 'serial' })

const FREDDY = 'freddy@eminat.net'
const NUEVO = 'nuevo@eminat.net'
const CREADO = 'creado@eminat.net'
const SIN_ASIGNAR = 'sin_asignar'

test('A6 · admin crea usuario → 201, fila sin_asignar + su propio Auth', async ({ page }) => {
  await ui.loginAs(page, FREDDY)
  // El email de bienvenida es best-effort: sin Resend en local devuelve 201 + emailWarning.
  const res = await page.request.post('/api/admin/create-user', {
    data: { email: CREADO, password: PASSWORD, nombre: 'Crea', apellido: 'Do' },
  })
  expect(res.status()).toBe(201)
  const { user } = await res.json()
  expect(user.rol).toBe(SIN_ASIGNAR)             // DEFAULT_ROLE
  // fila usuarios sembrada y ligada a un auth user con el mismo id (creación atómica)
  const u = await getUsuario(CREADO)
  expect(u?.rol).toBe(SIN_ASIGNAR)
  expect(await authIdByEmail(CREADO)).toBe(user.id)
  expect(u?.id).toBe(user.id)
})

test('A7 · reset-password de usuario sembrado (id≠auth) → 200', async ({ page }) => {
  await ui.loginAs(page, FREDDY)
  // nuevo@ está sembrado por ensureUser: usuarios.id ≠ auth id (el auth id vive en auth_id). El
  // endpoint debe resolverlo por la fila, no asumir id=auth. Reseteamos a la MISMA pass para no
  // romper los loginAs(NUEVO) de los otros specs.
  const nuevo = await getUsuario(NUEVO)
  const res = await page.request.post('/api/admin/reset-password', { data: { userId: nuevo.id, password: PASSWORD } })
  expect(res.ok()).toBeTruthy()
})
