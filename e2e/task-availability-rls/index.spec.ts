import { test, expect } from '@playwright/test'
import { ADMIN_ROLE, DEFAULT_ROLE } from '@/shared/auth/permissions'
import {
  PASSWORD,
  ensureUser,
  getUsuario,
  deleteUser,
  H,
} from '../seed'
import { URL } from '../constants'
import rest from '../rest'
import assignOrganization from '../availability-seed/assign-organization'
import clearWeeklyAvailability from '../availability-seed/clear-weekly-availability'
import firstDepartamentoId from '../availability-seed/first-departamento-id'
import firstActiveJornada from '../availability-seed/first-active-jornada'

// Weekly availability RLS: self-write, org-wide read for anyone with the `tasks` module. A
// SELECT only filters (200 either way), so negative cases use a WRITE -- a real rejection, or for
// UPDATE/DELETE across ownership (which RLS silently voids, not errors) a follow-up read proving
// nothing moved.
const TASKS_ROLE = 'stratix360'
const SURNAME = 'Availabilitye2e'
const OWNER_EMAIL = 'owner.availability.e2e@eminat.net'
const TEAMMATE_EMAIL = 'teammate.availability.e2e@eminat.net'
const OUTSIDER_EMAIL = 'outsider.availability.e2e@eminat.net'
const TEAMLESS_EMAIL = 'teamless.availability.e2e@eminat.net'
const ADMIN_EMAIL = 'admin.availability.e2e@eminat.net'
const NO_MODULE_EMAIL = 'nomodule.availability.e2e@eminat.net'
const OWNER_TEAM_CODE = 'E2E_AVAIL_OWNER'
const OUTSIDER_TEAM_CODE = 'E2E_AVAIL_OUTSIDER'
// Not imported from `@/shared/data`: that barrel pulls in the Supabase browser client, which
// validates NEXT_PUBLIC_* env vars at import time -- Playwright's Node process has none of
// those (unlike the Next dev server bundle), so the import would crash the test loader itself.
const TABLE = 'user_weekly_availability_ranges'
const REPLACE_RPC = 'replace_own_weekly_availability'
const ADMIN_TAMPER_NOTE = 'changed by admin'
const JORNADA_REQUIRED_ERROR = 'TASKS_JORNADA_REQUIRED'

const authHeaders = (jwt: string) => ({ headers: rest.como(jwt) })
const writeRequest = (jwt: string, data: Record<string, unknown>) => ({ headers: rest.como(jwt), data })
const rangesUrl = (query: string) => `${URL}/rest/v1/${TABLE}?${query}`
const rangeRow = (
  userId: string,
  weekday: number,
  startsAt: string,
  endsAt: string,
  note: string | null = null,
) => ({
  user_id: userId,
  weekday,
  starts_at: startsAt,
  ends_at: endsAt,
  note,
})

async function ensureTeam(codigo: string, nombre: string, departamentoId: string): Promise<string> {
  const insertUrl = `${URL}/rest/v1/equipos?on_conflict=codigo`
  const teamBody = { codigo, nombre, departamento_id: departamentoId }
  const insertInit = {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(teamBody),
  }
  const response = await fetch(insertUrl, insertInit)
  if (!response.ok) {
    const errorBody = await response.text()
    const errorMessage = `ensureTeam ${codigo}: ${response.status} ${errorBody}`
    throw new Error(errorMessage)
  }
  const rows = await response.json()
  return rows[0].id
}

async function deleteTeam(codigo: string): Promise<void> {
  const deleteUrl = `${URL}/rest/v1/equipos?codigo=eq.${codigo}`
  const deleteInit = { method: 'DELETE', headers: H }
  await fetch(deleteUrl, deleteInit)
}

let ownerId: string
let teammateId: string
let outsiderId: string
let teamlessId: string
let noModuleId: string
let adminId: string

test.beforeAll(async () => {
  const departamentoId = await firstDepartamentoId()
  const ownerTeamId = await ensureTeam(OWNER_TEAM_CODE, 'E2E Availability Owner Team', departamentoId)
  const outsiderTeamId = await ensureTeam(OUTSIDER_TEAM_CODE, 'E2E Availability Outsider Team', departamentoId)

  await ensureUser(OWNER_EMAIL, TASKS_ROLE, 'Owner', SURNAME)
  await ensureUser(TEAMMATE_EMAIL, TASKS_ROLE, 'Teammate', SURNAME)
  await ensureUser(OUTSIDER_EMAIL, TASKS_ROLE, 'Outsider', SURNAME)
  await ensureUser(TEAMLESS_EMAIL, TASKS_ROLE, 'Teamless', SURNAME)
  await ensureUser(ADMIN_EMAIL, ADMIN_ROLE, 'Admin', SURNAME)
  await ensureUser(NO_MODULE_EMAIL, DEFAULT_ROLE, 'NoModule', SURNAME)

  ownerId = (await getUsuario(OWNER_EMAIL)).id
  teammateId = (await getUsuario(TEAMMATE_EMAIL)).id
  outsiderId = (await getUsuario(OUTSIDER_EMAIL)).id
  teamlessId = (await getUsuario(TEAMLESS_EMAIL)).id
  noModuleId = (await getUsuario(NO_MODULE_EMAIL)).id
  adminId = (await getUsuario(ADMIN_EMAIL)).id

  // Only OWNER gets a jornada: the save RPC refuses callers without one, and TEAMMATE proves it.
  const jornada = await firstActiveJornada()
  const ownerOrg = { userId: ownerId, equipoId: ownerTeamId, jornadaId: jornada.id }
  const teammateOrg = { userId: teammateId, equipoId: ownerTeamId, jornadaId: null }
  const outsiderOrg = { userId: outsiderId, equipoId: outsiderTeamId, jornadaId: null }
  await assignOrganization(ownerOrg)
  await assignOrganization(teammateOrg)
  await assignOrganization(outsiderOrg)
})

test.afterAll(async () => {
  await clearWeeklyAvailability([ownerId, teammateId, outsiderId, teamlessId, noModuleId, adminId])
  await deleteUser(OWNER_EMAIL)
  await deleteUser(TEAMMATE_EMAIL)
  await deleteUser(OUTSIDER_EMAIL)
  await deleteUser(TEAMLESS_EMAIL)
  await deleteUser(ADMIN_EMAIL)
  await deleteUser(NO_MODULE_EMAIL)
  await deleteTeam(OWNER_TEAM_CODE)
  await deleteTeam(OUTSIDER_TEAM_CODE)
})

test('the owner can insert their own range; a teammate and a different team both read it', async ({ request }) => {
  const ownerJwt = await rest.token(request, OWNER_EMAIL, PASSWORD)
  const ownerRange = rangeRow(ownerId, 1, '09:00', '13:00')
  const insertResponse = await request.post(rangesUrl(''), writeRequest(ownerJwt, ownerRange))
  expect(insertResponse.ok(), 'the owner writes their own row').toBe(true)

  const teammateJwt = await rest.token(request, TEAMMATE_EMAIL, PASSWORD)
  const teammateRead = await request.get(rangesUrl(`user_id=eq.${ownerId}&select=id`), authHeaders(teammateJwt))
  expect((await teammateRead.json()).length, 'same-team read sees the row').toBeGreaterThan(0)

  const outsiderJwt = await rest.token(request, OUTSIDER_EMAIL, PASSWORD)
  const outsiderRead = await request.get(rangesUrl(`user_id=eq.${ownerId}&select=id`), authHeaders(outsiderJwt))
  expect((await outsiderRead.json()).length, 'a different team can also read it (org-wide)').toBeGreaterThan(0)
})

test('a teammate cannot insert a range in the owner\'s name', async ({ request }) => {
  const teammateJwt = await rest.token(request, TEAMMATE_EMAIL, PASSWORD)
  const impersonatedRange = rangeRow(ownerId, 2, '09:00', '10:00')
  const impersonation = await request.post(rangesUrl(''), writeRequest(teammateJwt, impersonatedRange))
  expect(impersonation.status(), 'WITH CHECK rejects writing someone else\'s user_id').toBe(403)
  expect((await impersonation.json()).code, 'violates row-level security policy').toBe('42501')
})

test('an admin reads every relevant schedule but cannot write another user\'s row', async ({ request }) => {
  const adminJwt = await rest.token(request, ADMIN_EMAIL, PASSWORD)
  const adminRead = await request.get(rangesUrl(`user_id=eq.${ownerId}&select=id`), authHeaders(adminJwt))
  expect((await adminRead.json()).length, 'admin read-all sees the owner\'s row').toBeGreaterThan(0)

  const adminTamperPayload = { note: ADMIN_TAMPER_NOTE }
  const adminUpdate = await request.patch(rangesUrl(`user_id=eq.${ownerId}`), writeRequest(adminJwt, adminTamperPayload))
  expect(adminUpdate.ok(), 'the request itself does not error -- RLS excludes the row before it is touched').toBe(true)

  const ownerJwt = await rest.token(request, OWNER_EMAIL, PASSWORD)
  const stillOriginal = await request.get(rangesUrl(`user_id=eq.${ownerId}&select=note`), authHeaders(ownerJwt))
  const tamperedRows = (await stillOriginal.json()).filter((row: { note: string | null }) => row.note === ADMIN_TAMPER_NOTE)
  expect(tamperedRows.length, 'admin\'s write never actually touched the owner\'s row').toBe(0)
})

test('an admin can read their own row, not just other people\'s', async ({ request }) => {
  const adminJwt = await rest.token(request, ADMIN_EMAIL, PASSWORD)
  const adminOwnRange = rangeRow(adminId, 1, '09:00', '12:00')
  const insertResponse = await request.post(rangesUrl(''), writeRequest(adminJwt, adminOwnRange))
  expect(insertResponse.ok(), 'the admin writes their own row (write path never depended on role_modules)').toBe(true)

  const adminSelfRead = await request.get(rangesUrl(`user_id=eq.${adminId}&select=id`), authHeaders(adminJwt))
  expect((await adminSelfRead.json()).length, 'the admin\'s own row is visible to themselves').toBeGreaterThan(0)
})

test('a teammate cannot delete the owner\'s row', async ({ request }) => {
  const ownerJwt = await rest.token(request, OWNER_EMAIL, PASSWORD)
  const before = await request.get(rangesUrl(`user_id=eq.${ownerId}&select=id`), authHeaders(ownerJwt))
  const rowCountBefore = (await before.json()).length

  const teammateJwt = await rest.token(request, TEAMMATE_EMAIL, PASSWORD)
  const teammateDelete = await request.delete(rangesUrl(`user_id=eq.${ownerId}`), authHeaders(teammateJwt))
  expect(teammateDelete.ok(), 'the request itself does not error -- RLS excludes the row before it is touched').toBe(true)

  const after = await request.get(rangesUrl(`user_id=eq.${ownerId}&select=id`), authHeaders(ownerJwt))
  expect((await after.json()).length, 'the owner\'s rows survive the teammate\'s delete attempt').toBe(rowCountBefore)
})

test('a teamless user still reads org-wide and a no-module user sees nothing', async ({ request }) => {
  const teamlessJwt = await rest.token(request, TEAMLESS_EMAIL, PASSWORD)
  const teamlessRead = await request.get(rangesUrl(`user_id=neq.${teamlessId}&select=id`), authHeaders(teamlessJwt))
  expect((await teamlessRead.json()).length, 'org-wide read does not depend on having a team').toBeGreaterThan(0)

  const noModuleJwt = await rest.token(request, NO_MODULE_EMAIL, PASSWORD)
  const noModuleRead = await request.get(rangesUrl('select=id'), authHeaders(noModuleJwt))
  expect(await noModuleRead.json(), 'tasks access gates the table entirely').toEqual([])
})

test('the table rejects malformed ranges and the exclusion constraint rejects overlap', async ({ request }) => {
  const ownerJwt = await rest.token(request, OWNER_EMAIL, PASSWORD)
  const insertAs = (row: ReturnType<typeof rangeRow>) => request.post(rangesUrl(''), writeRequest(ownerJwt, row))

  // This PostgREST version maps every class-23 integrity violation to 400, CHECK (23514) and
  // EXCLUDE (23P01) alike -- verified empirically, not the generic PostgREST docs' 409.
  const reversed = rangeRow(ownerId, 3, '10:00', '09:00')
  expect((await insertAs(reversed)).status(), 'ends before it starts').toBe(400)
  const weekdayZero = rangeRow(ownerId, 0, '09:00', '10:00')
  expect((await insertAs(weekdayZero)).status(), 'weekday 0 is out of range').toBe(400)
  const weekdayEight = rangeRow(ownerId, 8, '09:00', '10:00')
  expect((await insertAs(weekdayEight)).status(), 'weekday 8 is out of range').toBe(400)
  const longNote = 'x'.repeat(281)
  const noteTooLong = rangeRow(ownerId, 4, '09:00', '10:00', longNote)
  expect((await insertAs(noteTooLong)).status(), 'note over 280 chars').toBe(400)

  const base = rangeRow(ownerId, 5, '09:00', '11:00')
  const baseResponse = await insertAs(base)
  expect(baseResponse.ok(), 'a clean range still inserts').toBe(true)
  const overlapping = rangeRow(ownerId, 5, '10:00', '12:00')
  expect((await insertAs(overlapping)).status(), 'overlapping range on the same day').toBe(400)
  const touching = rangeRow(ownerId, 5, '11:00', '12:00')
  expect((await insertAs(touching)).ok(), 'a touching range is not an overlap').toBe(true)
  const sameClockOtherDay = rangeRow(ownerId, 6, '09:00', '11:00')
  expect((await insertAs(sameClockOtherDay)).ok(), 'the same clock range on another day is fine').toBe(true)
})

test('replace_own_weekly_availability atomically replaces the caller\'s rows and rejects a spoofed user_id', async ({ request }) => {
  const ownerJwt = await rest.token(request, OWNER_EMAIL, PASSWORD)
  const firstSet = [
    {
      weekday: 1,
      starts_at: '08:00',
      ends_at: '12:00',
      note: null,
    },
    {
      weekday: 2,
      starts_at: '08:00',
      ends_at: '12:00',
      note: null,
    },
  ]
  const firstArgs = { p_ranges: firstSet }
  const firstCall = await rest.rpc(request, ownerJwt, REPLACE_RPC, firstArgs)
  expect(firstCall.ok(), 'the first replace call succeeds').toBe(true)
  expect((await firstCall.json()).length, 'the first set lands').toBe(2)

  const secondSet = [
    {
      weekday: 3,
      starts_at: '14:00',
      ends_at: '18:00',
      note: 'only range left',
    },
  ]
  const secondArgs = { p_ranges: secondSet }
  const secondCall = await rest.rpc(request, ownerJwt, REPLACE_RPC, secondArgs)
  expect(secondCall.ok(), 'the second replace call succeeds').toBe(true)
  const afterReplace = await secondCall.json()
  expect(afterReplace.length, 'only the second set remains: the replace is atomic, not additive').toBe(1)
  expect(afterReplace[0].weekday, 'the surviving row is from the second set').toBe(3)

  const spoofedSet = [
    {
      user_id: teammateId,
      weekday: 4,
      starts_at: '09:00',
      ends_at: '10:00',
      note: null,
    },
  ]
  const spoofedArgs = { p_ranges: spoofedSet }
  const spoofedCall = await rest.rpc(request, ownerJwt, REPLACE_RPC, spoofedArgs)
  expect(spoofedCall.status(), 'a payload naming user_id is rejected as malformed, not trusted').toBe(400)
})

test('replace_own_weekly_availability refuses a caller with no jornada assigned', async ({ request }) => {
  const teammateJwt = await rest.token(request, TEAMMATE_EMAIL, PASSWORD)
  const ownSet = [
    {
      weekday: 1,
      starts_at: '09:00',
      ends_at: '10:00',
      note: null,
    },
  ]
  const ownArgs = { p_ranges: ownSet }
  const ownCall = await rest.rpc(request, teammateJwt, REPLACE_RPC, ownArgs)
  const ownBody = await ownCall.json()

  expect(ownCall.status(), 'saving one\'s own week without a jornada is forbidden').toBe(403)
  expect(ownBody.message, 'the RPC names why it refused').toBe(JORNADA_REQUIRED_ERROR)
})
