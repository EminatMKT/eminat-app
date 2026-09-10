import { test, expect } from '@playwright/test'
import { PASSWORD, H, ensureUser, deleteUser, getUsuario, ensureRoleModule, restoreRoleModule, ensureReunion, deleteReunion } from './seed'
import { MODULE } from '../src/shared/auth/permissions'
import { URL, ANON } from './constants'
import rest from './rest'

// Ninguno de los tres roles es admin, a propósito: `has_module()`, `puedo_ver_reunion()` y el
// `is_admin()` explícito de `tema_para_acta()` abren todos con `is_admin() OR …`, así que probar
// con una cuenta admin no probaría nada de esto.
const CON_OPS = 'temas.ops@eminat.net'    // `operations`, no admin: para el POST directo (cambio 1)
const CON_REU = 'temas.reu@eminat.net'    // `reuniones`, crea el acta: la puerta real es la RPC
const SIN_NADA = 'temas.nada@eminat.net'  // ningún módulo ni relación con el acta
const TITULO = 'Tema de prueba RLS'

let idReunion = ''
let yaTeniaReuniones = false

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  await ensureUser(CON_OPS, 'stratix360')
  await ensureUser(CON_REU, 'medico_investigacion')
  await ensureUser(SIN_NADA, 'sin_asignar')
  // Local está drifteado respecto de prod: acá `medico_investigacion` no tiene `reuniones`.
  yaTeniaReuniones = await ensureRoleModule('medico_investigacion', MODULE.REUNIONES)
  // `creo_la_reunion()` es lo único que la RPC necesita del lado del acta: nada de armar la mesa.
  idReunion = await ensureReunion(CON_REU)
})

test.afterAll(async () => {
  // El tema va ANTES que la reunión y los usuarios: `creado_por_id` es ON DELETE SET NULL, no
  // RESTRICT, pero dejar huérfanos rompe el contrato que `global-teardown.ts` da por sentado.
  await fetch(`${URL}/rest/v1/temas?titulo=eq.${encodeURIComponent(TITULO)}`, { method: 'DELETE', headers: H })
  await deleteReunion(idReunion)
  await restoreRoleModule('medico_investigacion', MODULE.REUNIONES, yaTeniaReuniones)
  for (const email of [CON_OPS, CON_REU, SIN_NADA]) await deleteUser(email)
})

test('anon no llega a la tabla ni con la llave del bundle', async ({ request }) => {
  const r = await request.get(`${URL}/rest/v1/temas?select=id`, { headers: { apikey: ANON } })
  // 401/403: el GRANT está revocado. Un 200 con [] sería el modo de falla peligroso — parece
  // "no hay temas" y es "la tabla está abierta y todavía vacía".
  expect(r.status(), 'anon tiene que rebotar, no ver una lista vacía').toBeGreaterThanOrEqual(401)
})

// El oráculo que el cambio 1 cierra: antes, un 23505 en este mismo POST le confirmaba a un
// no-admin que el título ya existía en esa empresa aunque `temas_select` se lo escondiera.
test('un no-admin con el módulo NO puede crear un tema por REST directo', async ({ request }) => {
  const jwt = await rest.token(request, CON_OPS, PASSWORD)
  const r = await request.post(`${URL}/rest/v1/temas`, {
    headers: { ...rest.como(jwt), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    data: { empresa: 'EMC', titulo: TITULO, creado_por_id: (await getUsuario(CON_OPS))?.id },
  })
  expect(r.status(), '42501 → 403: temas_insert ahora es sólo admin').toBe(403)
})

// La puerta real, con la tabla cerrada: `tema_para_acta()` es SECURITY DEFINER y no pasa por
// `temas_insert`. Autoriza por la relación con el acta (acá, `creo_la_reunion()`), no por módulo.
test('quien creó el acta abierta da de alta un tema por tema_para_acta()', async ({ request }) => {
  const jwt = await rest.token(request, CON_REU, PASSWORD)
  const r = await rest.rpc(request, jwt, 'tema_para_acta', { p_reunion: idReunion, p_titulo: TITULO })
  expect(r.status(), 'la RPC crea donde el INSERT directo ahora rebota').toBe(200)
  expect(typeof (await r.json())).toBe('string')  // el uuid del tema
})

// Sin relación con esa acta —ni admin—, la RPC rebota igual que rebotaría por `reunion_temas_write`
// (mismo predicado, 20260830204042). El módulo no entra acá: la función no lo mira.
test('quien no creó ni preside el acta rebota en la RPC', async ({ request }) => {
  const jwt = await rest.token(request, SIN_NADA, PASSWORD)
  const r = await rest.rpc(request, jwt, 'tema_para_acta', { p_reunion: idReunion, p_titulo: 'Otro título' })
  expect(r.status(), '42501 → 403: ni preside ni creó el acta').toBe(403)
})
