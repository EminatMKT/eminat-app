import { test, expect } from '@playwright/test'
import { ADMIN_ROLE, DEFAULT_ROLE } from '@/shared/auth/permissions'
import { TABLES } from '@/shared/data/tables'
import { RPCS } from '@/shared/schema'
import { RLS_VIOLATION_CODE } from '@/app/api/tasks/availability/helpers/test-fixtures/constants'
import {
  PASSWORD,
  ensureUser,
  getUsuario,
  deleteUser,
} from '../seed'
import { URL } from '../constants'
import rest from '../rest'
import {
  TASKS_ROLE,
  assignOrganization,
  clearWeeklyAvailability,
  deleteTeam,
  ensureTeam,
  firstActiveJornada,
  firstDepartamentoId,
} from '../availability-seed'

// Self-write, org-wide read for `tasks`. A SELECT only filters (200 either way), so negative cases
// WRITE: a real rejection, or for cross-owner UPDATE/DELETE (RLS voids them silently, no error) a
// follow-up read proving nothing moved.
const SURNAME = 'Availabilitye2e'
const OWNER_EMAIL = 'owner.availability.e2e@eminat.net'
const TEAMMATE_EMAIL = 'teammate.availability.e2e@eminat.net'
const OUTSIDER_EMAIL = 'outsider.availability.e2e@eminat.net'
const TEAMLESS_EMAIL = 'teamless.availability.e2e@eminat.net'
const ADMIN_EMAIL = 'admin.availability.e2e@eminat.net'
const NO_MODULE_EMAIL = 'nomodule.availability.e2e@eminat.net'
const OWNER_TEAM_CODE = 'E2E_AVAIL_OWNER'
const OUTSIDER_TEAM_CODE = 'E2E_AVAIL_OUTSIDER'
const OWNER_TEAM_NAME = 'E2E Availability Owner Team'
const OUTSIDER_TEAM_NAME = 'E2E Availability Outsider Team'
const TABLE = TABLES.weeklyAvailabilityRanges
const REPLACE_RPC = RPCS.replaceOwnWeeklyAvailability
const ADMIN_TAMPER_NOTE = 'changed by admin'
const JORNADA_REQUIRED_ERROR = 'TASKS_JORNADA_REQUIRED'
const NO_QUERY = ''
const ALL_ROWS_QUERY = 'select=id'
const USERS: Parameters<typeof ensureUser>[] = [
  [OWNER_EMAIL, TASKS_ROLE, 'Owner', SURNAME],
  [TEAMMATE_EMAIL, TASKS_ROLE, 'Teammate', SURNAME],
  [OUTSIDER_EMAIL, TASKS_ROLE, 'Outsider', SURNAME],
  [TEAMLESS_EMAIL, TASKS_ROLE, 'Teamless', SURNAME],
  [ADMIN_EMAIL, ADMIN_ROLE, 'Admin', SURNAME],
  [NO_MODULE_EMAIL, DEFAULT_ROLE, 'NoModule', SURNAME],
]

type Slot = {
  weekday: number
  starts_at: string
  ends_at: string
}

const OWNER_FIRST_SLOT: Slot = { weekday: 1, starts_at: '09:00', ends_at: '13:00' }
const IMPERSONATED_SLOT: Slot = { weekday: 2, starts_at: '09:00', ends_at: '10:00' }
const ADMIN_OWN_SLOT: Slot = { weekday: 1, starts_at: '09:00', ends_at: '12:00' }
const REVERSED_SLOT: Slot = { weekday: 3, starts_at: '10:00', ends_at: '09:00' }
const WEEKDAY_ZERO_SLOT: Slot = { weekday: 0, starts_at: '09:00', ends_at: '10:00' }
const WEEKDAY_EIGHT_SLOT: Slot = { weekday: 8, starts_at: '09:00', ends_at: '10:00' }
const LONG_NOTE_SLOT: Slot = { weekday: 4, starts_at: '09:00', ends_at: '10:00' }
const BASE_SLOT: Slot = { weekday: 5, starts_at: '09:00', ends_at: '11:00' }
const OVERLAPPING_SLOT: Slot = { weekday: 5, starts_at: '10:00', ends_at: '12:00' }
const TOUCHING_SLOT: Slot = { weekday: 5, starts_at: '11:00', ends_at: '12:00' }
const SAME_CLOCK_OTHER_DAY_SLOT: Slot = { weekday: 6, starts_at: '09:00', ends_at: '11:00' }

const authHeaders = (jwt: string) => ({ headers: rest.como(jwt) })
const writeRequest = (jwt: string, data: Record<string, unknown>) => ({
  headers: rest.como(jwt),
  data,
})
const rangesUrl = (query: string) => `${URL}/rest/v1/${TABLE}?${query}`
const RANGES_INSERT_URL = rangesUrl(NO_QUERY)

function rangeRow(userId: string, slot: Slot, note: string | null = null) {
  const row = { user_id: userId, ...slot, note }

  return row
}

let ownerId: string
let teammateId: string
let outsiderId: string
let teamlessId: string
let noModuleId: string
let adminId: string

test.beforeAll(async () => {
  const departamentoId = await firstDepartamentoId()
  const ownerTeam = { codigo: OWNER_TEAM_CODE, nombre: OWNER_TEAM_NAME, departamentoId }
  const outsiderTeam = { codigo: OUTSIDER_TEAM_CODE, nombre: OUTSIDER_TEAM_NAME, departamentoId }
  const ownerTeamId = await ensureTeam(ownerTeam)
  const outsiderTeamId = await ensureTeam(outsiderTeam)

  for (const user of USERS) await ensureUser(...user)

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

  for (const organization of [ownerOrg, teammateOrg, outsiderOrg]) {
    await assignOrganization(organization)
  }
})

test.afterAll(async () => {
  const userIds = [ownerId, teammateId, outsiderId, teamlessId, noModuleId, adminId]

  await clearWeeklyAvailability(userIds)

  for (const [email] of USERS) await deleteUser(email)

  for (const teamCode of [OWNER_TEAM_CODE, OUTSIDER_TEAM_CODE]) await deleteTeam(teamCode)
})

test('the owner can insert their own range; a teammate and a different team both read it', async ({ request }) => {
  const ownerJwt = await rest.token(request, OWNER_EMAIL, PASSWORD)
  const ownerRange = rangeRow(ownerId, OWNER_FIRST_SLOT)
  const insertResponse = await request.post(RANGES_INSERT_URL, writeRequest(ownerJwt, ownerRange))

  expect(insertResponse.ok(), 'the owner writes their own row').toBe(true)

  const ownerRowsUrl = rangesUrl(`user_id=eq.${ownerId}&select=id`)
  const teammateJwt = await rest.token(request, TEAMMATE_EMAIL, PASSWORD)
  const teammateRead = await request.get(ownerRowsUrl, authHeaders(teammateJwt))

  expect((await teammateRead.json()).length, 'same-team read sees the row').toBeGreaterThan(0)

  const outsiderJwt = await rest.token(request, OUTSIDER_EMAIL, PASSWORD)
  const outsiderRead = await request.get(ownerRowsUrl, authHeaders(outsiderJwt))

  expect((await outsiderRead.json()).length, 'a different team can also read it (org-wide)').toBeGreaterThan(0)
})

test('a teammate cannot insert a range in the owner\'s name', async ({ request }) => {
  const teammateJwt = await rest.token(request, TEAMMATE_EMAIL, PASSWORD)
  const impersonatedRange = rangeRow(ownerId, IMPERSONATED_SLOT)
  const impersonationRequest = writeRequest(teammateJwt, impersonatedRange)
  const impersonation = await request.post(RANGES_INSERT_URL, impersonationRequest)

  expect(impersonation.status(), 'WITH CHECK rejects writing someone else\'s user_id').toBe(403)
  expect((await impersonation.json()).code, 'violates row-level security policy').toBe(RLS_VIOLATION_CODE)
})

test('an admin reads every relevant schedule but cannot write another user\'s row', async ({ request }) => {
  const adminJwt = await rest.token(request, ADMIN_EMAIL, PASSWORD)
  const adminRead = await request.get(rangesUrl(`user_id=eq.${ownerId}&select=id`), authHeaders(adminJwt))

  expect((await adminRead.json()).length, 'admin read-all sees the owner\'s row').toBeGreaterThan(0)

  const adminTamperPayload = { note: ADMIN_TAMPER_NOTE }
  const ownerRowsUrl = rangesUrl(`user_id=eq.${ownerId}`)
  const adminUpdate = await request.patch(ownerRowsUrl, writeRequest(adminJwt, adminTamperPayload))

  expect(adminUpdate.ok(), 'the request itself does not error -- RLS excludes the row before it is touched').toBe(true)

  const ownerJwt = await rest.token(request, OWNER_EMAIL, PASSWORD)
  const stillOriginal = await request.get(rangesUrl(`user_id=eq.${ownerId}&select=note`), authHeaders(ownerJwt))
  const isTampered = (row: { note: string | null }) => row.note === ADMIN_TAMPER_NOTE
  const tamperedRows = (await stillOriginal.json()).filter(isTampered)

  expect(tamperedRows.length, 'admin\'s write never actually touched the owner\'s row').toBe(0)
})

test('an admin can read their own row, not just other people\'s', async ({ request }) => {
  const adminJwt = await rest.token(request, ADMIN_EMAIL, PASSWORD)
  const adminOwnRange = rangeRow(adminId, ADMIN_OWN_SLOT)
  const adminInsert = writeRequest(adminJwt, adminOwnRange)
  const insertResponse = await request.post(RANGES_INSERT_URL, adminInsert)

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
  const noModuleRead = await request.get(rangesUrl(ALL_ROWS_QUERY), authHeaders(noModuleJwt))

  expect(await noModuleRead.json(), 'tasks access gates the table entirely').toEqual([])
})

test('the table rejects malformed ranges and the exclusion constraint rejects overlap', async ({ request }) => {
  const ownerJwt = await rest.token(request, OWNER_EMAIL, PASSWORD)
  const insertAs = (row: ReturnType<typeof rangeRow>) =>
    request.post(RANGES_INSERT_URL, writeRequest(ownerJwt, row))

  // This PostgREST version maps every class-23 integrity violation to 400, CHECK (23514) and
  // EXCLUDE (23P01) alike -- verified empirically, not the generic PostgREST docs' 409.
  const reversed = rangeRow(ownerId, REVERSED_SLOT)

  expect((await insertAs(reversed)).status(), 'ends before it starts').toBe(400)

  const weekdayZero = rangeRow(ownerId, WEEKDAY_ZERO_SLOT)

  expect((await insertAs(weekdayZero)).status(), 'weekday 0 is out of range').toBe(400)

  const weekdayEight = rangeRow(ownerId, WEEKDAY_EIGHT_SLOT)

  expect((await insertAs(weekdayEight)).status(), 'weekday 8 is out of range').toBe(400)

  const longNote = 'x'.repeat(281)
  const noteTooLong = rangeRow(ownerId, LONG_NOTE_SLOT, longNote)

  expect((await insertAs(noteTooLong)).status(), 'note over 280 chars').toBe(400)

  const base = rangeRow(ownerId, BASE_SLOT)
  const baseResponse = await insertAs(base)

  expect(baseResponse.ok(), 'a clean range still inserts').toBe(true)

  const overlapping = rangeRow(ownerId, OVERLAPPING_SLOT)

  expect((await insertAs(overlapping)).status(), 'overlapping range on the same day').toBe(400)

  const touching = rangeRow(ownerId, TOUCHING_SLOT)

  expect((await insertAs(touching)).ok(), 'a touching range is not an overlap').toBe(true)

  const sameClockOtherDay = rangeRow(ownerId, SAME_CLOCK_OTHER_DAY_SLOT)

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
