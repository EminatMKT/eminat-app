import { test, expect } from '@playwright/test'
import { ADMIN_ROLE } from '@/shared/auth/permissions'
import { ensureUser, getUsuario, setRol, H } from './seed'
import { URL as SUPA, RAIL_ADMIN } from './constants'
import ui from './ui'

// Sección C de los E2E de roles: varios admins conviviendo y el guard de último admin. Serial:
// C9 crea el segundo admin y los dos siguientes lo usan. Vive aparte de `roles.spec.ts` porque
// ese archivo pasó el techo de 150 líneas, y esta sección es la que se lee sola.
test.describe.configure({ mode: 'serial' })

const BOOTSTRAP = 'bootstrap@eminat.net'
const ADMIN2 = 'admin2@eminat.net'
const SIN_ASIGNAR = 'sin_asignar'

type Fila = { id: string; email: string }

test('C9/C10 · 2º admin independiente con su propio Auth', async ({ page }) => {
  await ensureUser(ADMIN2, ADMIN_ROLE, 'Admin', 'Dos')
  expect((await getUsuario(ADMIN2))?.rol).toBe(ADMIN_ROLE)
  await ui.loginAs(page, ADMIN2)
  await expect(page.locator(RAIL_ADMIN)).toBeVisible()
  await ui.openAdmin(page) // accede al panel admin sin Access denied
})

test('C11 · borrar al admin bootstrap no afecta a los demás', async ({ page }) => {
  await ui.loginAs(page, ADMIN2)
  const bootId = (await getUsuario(BOOTSTRAP))!.id
  // flujo real: degradar primero (delete-user bloquea borrar admins), luego borrar
  const demote = await page.request.post('/api/admin/update-user', { data: { id: bootId, rol: SIN_ASIGNAR } })
  expect(demote.ok()).toBeTruthy()
  const del = await page.request.post('/api/admin/delete-user', { data: { id: bootId } })
  expect(del.ok()).toBeTruthy()
  expect(await getUsuario(BOOTSTRAP)).toBeNull()
  await ui.openAdmin(page) // admin2 sigue funcionando
})

test('C12 · guard de último admin bloquea degradarlo', async ({ page }) => {
  await ui.loginAs(page, ADMIN2)
  const admin2Id = (await getUsuario(ADMIN2))!.id
  // Los admins que hay AHORA, no los que sembró el global-setup: esta base tiene usuarios reales
  // además de los fixtures, y con un tercer admin vivo el guard nunca dispara — el test pasaba en
  // verde sin haber probado nada. Degradarlos es además el camino feliz: con admin2 no bloquea.
  const q = `rol=eq.${ADMIN_ROLE}&activo=eq.true&select=id,email&order=email.asc`
  const admins = (await (await fetch(`${SUPA}/rest/v1/usuarios?${q}`, { headers: H })).json()) as Fila[]
  const otros = admins.filter((u) => u.id !== admin2Id)
  expect(otros.length, 'hace falta otro admin para que el caso feliz exista').toBeGreaterThan(0)
  for (const u of otros) {
    const ok = await page.request.post('/api/admin/update-user', { data: { id: u.id, rol: SIN_ASIGNAR } })
    expect(ok.ok(), `degradar a ${u.email} mientras admin2 sigue siendo admin`).toBeTruthy()
  }
  try {
    // ahora admin2 es el único → degradarlo debe fallar
    const blocked = await page.request.post('/api/admin/update-user', { data: { id: admin2Id, rol: SIN_ASIGNAR } })
    expect(blocked.status()).toBe(400)
    expect((await blocked.json()).error).toContain('último admin')
  } finally {
    // El teardown sólo restaura a freddy. Los demás no le pertenecen a este test, y dejarlos
    // degradados rompe el panel para quien use esta base a mano después.
    for (const u of otros) await setRol(u.email, ADMIN_ROLE)
  }
})

// C13 (reassign-and-delete con dependencias) — no automatizado: requiere sembrar
// actividades/FKs; cubierto por el guard isLastAdmin (unit) + casos C11/C12.
