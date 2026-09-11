import { test, expect } from '@playwright/test'
import { PASSWORD, ensureAuthUser, ensureUser, deleteUser } from './seed'
import { URL, ANON } from './constants'
import rest from './rest'
import { ADMIN_ROLE } from '@/shared/auth/permissions'

// Tener sesión no es, por sí solo, una autorización. El 10/09/2026 lo era: `usuarios` y
// `empresas` abrían con `qual: true` para `authenticated`, y una segunda app sobre este mismo
// proyecto repartía sesiones a cualquier correo. Ver docs/superpowers/plans/2026-09-10-*.md.
const OUTSIDER = 'forastero.rls@ejemplo-externo.com'
const STAFF = 'personal.rls@eminat.net'

// Sin `mode: 'serial'` a propósito: los cuatro tests no comparten estado mutable, y en serial
// el primer rojo saltea a los otros tres — justo los que dicen si el cierre rompió la app.
test.beforeAll(async () => {
  await ensureAuthUser(OUTSIDER)
  await ensureUser(STAFF, 'sin_asignar')
})

test.afterAll(async () => {
  await deleteUser(OUTSIDER)
  await deleteUser(STAFF)
})

test('un forastero con sesión no lee el directorio de usuarios', async ({ request }) => {
  const jwt = await rest.token(request, OUTSIDER, PASSWORD)
  const r = await request.get(`${URL}/rest/v1/usuarios?select=id,email`, { headers: rest.como(jwt) })
  expect(r.ok(), 'la llamada resuelve; lo que no trae son filas').toBe(true)
  expect(await r.json(), 'cero filas: no tiene fila en usuarios').toEqual([])
})

test('un forastero con sesión no lee las empresas', async ({ request }) => {
  const jwt = await rest.token(request, OUTSIDER, PASSWORD)
  const r = await request.get(`${URL}/rest/v1/empresas?select=id`, { headers: rest.como(jwt) })
  expect(r.ok()).toBe(true)
  expect(await r.json(), 'cero filas').toEqual([])
})

// El contraste, y lo que impide el falso verde: si el cierre se hiciera revocando el GRANT en
// vez de calificando la policy, los dos de arriba darían cero igual — y el arreglo habría roto
// la app para todo el mundo sin que ningún test lo dijera.
test('alguien del personal SÍ lee el directorio y las empresas', async ({ request }) => {
  const jwt = await rest.token(request, STAFF, PASSWORD)
  const u = await request.get(`${URL}/rest/v1/usuarios?select=id`, { headers: rest.como(jwt) })
  expect((await u.json()).length, 'el personal ve el directorio').toBeGreaterThan(0)
  const e = await request.get(`${URL}/rest/v1/empresas?select=id`, { headers: rest.como(jwt) })
  expect((await e.json()).length, 'el personal ve las empresas').toBeGreaterThan(0)
})

// Un solo catálogo como muestra de los ocho: `role_modules` es el que más sirve a alguien de
// afuera, porque dice qué módulos toca cada rol. Los otros siete los cubre el guard de la
// migración `20260911014505`, que aborta si queda alguna policy sin calificar.
test('un forastero con sesión no lee el modelo de permisos', async ({ request }) => {
  const jwt = await rest.token(request, OUTSIDER, PASSWORD)
  const r = await request.get(`${URL}/rest/v1/role_modules?select=role_key`, { headers: rest.como(jwt) })
  expect(r.ok()).toBe(true)
  expect(await r.json(), 'cero filas').toEqual([])
})

// Una lectura no puede probar que la RLS cerró: filtra, no rechaza, y `200 []` es lo mismo que
// una tabla vacía. Sólo una escritura da un rechazo visible, y ésta es la que más duele: el
// forastero fabricándose su fila de personal para volverse `es_personal()` por la puerta de atrás.
test('un forastero con sesión no se puede fabricar una fila de personal', async ({ request }) => {
  const jwt = await rest.token(request, OUTSIDER, PASSWORD)
  const r = await request.post(`${URL}/rest/v1/usuarios`, {
    headers: rest.como(jwt),
    data: { email: OUTSIDER, nombre: 'No', apellido: 'Va', rol: ADMIN_ROLE },
  })
  expect(r.status(), 'la policy rechaza la escritura, no la filtra en silencio').toBe(403)
  expect((await r.json()).code, 'violates row-level security policy').toBe('42501')
})

test('anon no llega a usuarios ni con la llave del bundle', async ({ request }) => {
  const r = await request.get(`${URL}/rest/v1/usuarios?select=id`, { headers: { apikey: ANON } })
  // 401/403 y no un 200 con []: el segundo parece "no hay nada" y es "está abierta y vacía".
  expect(r.status(), 'el GRANT de anon está revocado: rebota').toBeGreaterThanOrEqual(401)
})
