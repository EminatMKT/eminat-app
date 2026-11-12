import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { NextRequest } from 'next/server'
import { MODULE } from '@/shared/auth/permissions'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'
import type { Access } from '@/shared/db/types'
import { PAD_CHAR, PAD_LENGTH } from '@/features/tasks/utils/availability/constants'
import {
  EXCLUSION_VIOLATION_CODE,
  INVALID_RANGES_MESSAGE,
  INVALID_RANGES_STATUS as INVALID_STATUS,
  LOAD_FAILED_MESSAGE,
  LOAD_FAILED_STATUS,
  MAX_RANGES_PER_REQUEST,
  NOTE_MAX_LENGTH,
  PROFILE_UNAVAILABLE_MESSAGE,
  PROFILE_UNAVAILABLE_STATUS as PROFILE_STATUS,
  SAVE_CONFLICT_MESSAGE,
  SAVE_CONFLICT_STATUS as CONFLICT_STATUS,
  SAVE_FAILED_MESSAGE,
  SAVE_FAILED_STATUS,
} from '@/app/api/tasks/availability/constants'
import {
  AUTH_USER_ID,
  CACHE_CONTROL_HEADER,
  DENIED_ACCESS,
  DENIED_ERROR,
  DENIED_STATUS,
  GET_RPC,
  GRANTED_ACCESS,
  JSON_METHOD,
  NO_STORE,
  RLS_VIOLATION_CODE,
  ROUTE_URL,
  SAVE_RPC,
  VIEWER_ID,
} from '@/app/api/tasks/availability/helpers/test-fixtures/constants'
import { GET, PUT } from '@/app/api/tasks/availability/route'

// Drives both verbs end to end through the route; only the module guard and the SSR client are
// faked. Expected values come from the contract, so table and column names are spelled out.
const {
  REQUIRE_MODULE_PATH,
  SSR_CLIENT_PATH,
  requireModule,
  ssrClient,
} = vi.hoisted(() => ({
  REQUIRE_MODULE_PATH: '@/shared/db/requireAccess/requireModule',
  SSR_CLIENT_PATH: '@/shared/db/requireAccess/ssrClient',
  requireModule: vi.fn(),
  ssrClient: vi.fn(),
}))

vi.mock(REQUIRE_MODULE_PATH, () => ({ default: requireModule }))
vi.mock(SSR_CLIENT_PATH, () => ({ default: ssrClient }))

const {
  id: ID_COLUMN,
  authId: AUTH_ID_COLUMN,
  activo: ACTIVE_COLUMN,
} = TABLE_COLUMNS.usuarios
const OK_STATUS = 200
const PUT_METHOD = 'PUT'
const NOT_JSON = '{ranges:'
const OTHER_ID = 'other-1'
const PAD = '   '
const FILLER = 'x'
const TOP_OF_HOUR = ':00'
const RANGES_PER_DAY = 10
const ANONYMOUS_GRANT: Access = { ok: true }
const PROFILE_ROW = { id: VIEWER_ID }

const VIEWER_ROW = {
  user_id: VIEWER_ID,
  first_name: 'Ada',
  last_name: 'Lovelace',
  team_id: 'team-1',
  team_name: 'Design',
  workday_id: 'wd-1',
  workday_name: 'Full time',
  hours_per_week: 40,
  range_id: 'r-1',
  weekday: 1,
  starts_at: '09:00:00',
  ends_at: '12:00:00',
  note: 'Focus',
}
const OTHER_ROW = {
  ...VIEWER_ROW,
  user_id: OTHER_ID,
  first_name: '  Grace ',
  last_name: '',
  team_id: null,
  team_name: null,
  workday_id: null,
  workday_name: null,
  hours_per_week: null,
  range_id: 'r-2',
  weekday: 2,
  starts_at: '07:15:00',
  ends_at: '24:00:00',
  note: null,
}
const LATE_VIEWER_ROW = {
  ...VIEWER_ROW,
  range_id: 'r-3',
  weekday: 7,
  starts_at: '18:00:00',
  ends_at: '20:30:00',
  note: null,
}
const MEMBER_ONLY_ROW = {
  ...OTHER_ROW,
  range_id: null,
  weekday: null,
  starts_at: null,
  ends_at: null,
}
const PARTIAL_JOIN_ROW = { ...VIEWER_ROW, team_name: null, hours_per_week: null }
const ZERO_HOURS_ROW = { ...VIEWER_ROW, hours_per_week: 0 }

const TEAM = { id: 'team-1', name: 'Design' }
const WORKDAY = { id: 'wd-1', name: 'Full time', hoursPerWeek: 40 }
const ZERO_HOURS_WORKDAY = { ...WORKDAY, hoursPerWeek: 0 }
const R1 = {
  id: 'r-1',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '12:00',
  note: 'Focus',
}
const R2 = {
  id: 'r-2',
  weekday: 2,
  startsAt: '07:15',
  endsAt: '24:00',
  note: null,
}
const R3 = {
  id: 'r-3',
  weekday: 7,
  startsAt: '18:00',
  endsAt: '20:30',
  note: null,
}
const VIEWER_MEMBER = {
  id: VIEWER_ID,
  name: 'Ada Lovelace',
  team: TEAM,
  workday: WORKDAY,
  ranges: [R1, R3],
  canEdit: true,
}
const OTHER_MEMBER = {
  id: OTHER_ID,
  name: 'Grace',
  team: null,
  workday: null,
  ranges: [R2],
  canEdit: false,
}
const PARTIAL_MEMBER = {
  ...VIEWER_MEMBER,
  team: null,
  workday: null,
  ranges: [R1],
}
const RANGELESS_MEMBER = { ...OTHER_MEMBER, ranges: [] }
const EXPECTED_RESPONSE = { viewerUserId: VIEWER_ID, members: [OTHER_MEMBER, VIEWER_MEMBER] }
const RANGELESS_RESPONSE = { viewerUserId: VIEWER_ID, members: [RANGELESS_MEMBER] }
const EMPTY_RESPONSE = { viewerUserId: VIEWER_ID, members: [] }

type DbSetup = { profileRow: unknown; read: unknown; save: unknown }

const READ_OK = { data: [OTHER_ROW, VIEWER_ROW, LATE_VIEWER_ROW], error: null }
const SAVE_OK = { data: null, error: null }
const DB_ERROR = { code: RLS_VIOLATION_CODE }
const CONFLICT_ERROR = { code: EXCLUSION_VIOLATION_CODE }
const DEFAULT_SETUP: DbSetup = { profileRow: PROFILE_ROW, read: READ_OK, save: SAVE_OK }
const NO_OVERRIDES: Partial<DbSetup> = {}
const NO_PROFILE: Partial<DbSetup> = { profileRow: null }
const READ_FAILS_WITH_DATA = { read: { data: [VIEWER_ROW], error: DB_ERROR } }
const READ_NULL_DATA = { read: { data: null, error: null } }
const READ_FAILS = { read: { data: null, error: DB_ERROR } }
const SAVE_CONFLICTS = { save: { data: null, error: CONFLICT_ERROR } }
const SAVE_FAILS = { save: { data: null, error: DB_ERROR } }

function profileQuery(profileRow: unknown) {
  const lookup = { data: profileRow, error: null }
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }

  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.maybeSingle.mockResolvedValue(lookup)

  return query
}

function installDb(overrides: Partial<DbSetup> = NO_OVERRIDES) {
  const { profileRow, read, save } = { ...DEFAULT_SETUP, ...overrides }
  const query = profileQuery(profileRow)
  const rpc = vi.fn(async (name: string) => (name === GET_RPC ? read : save))
  const db = { from: vi.fn(() => query), rpc, query }

  ssrClient.mockReturnValue(db)

  return db
}

function readWith(rows: unknown[]) {
  const overrides = { read: { data: rows, error: null } }

  return installDb(overrides)
}

function putRaw(body: string) {
  const init = { method: PUT_METHOD, body }

  return new NextRequest(ROUTE_URL, init)
}

function put(body: unknown) {
  return PUT(putRaw(JSON.stringify(body)))
}

async function expectError(response: Response, status: number, message: string) {
  const expected = { error: message }

  expect(response.status).toBe(status)
  expect(await response.json()).toEqual(expected)
}

function hourOf(value: number) {
  const padded = String(value).padStart(PAD_LENGTH, PAD_CHAR)
  const time = padded + TOP_OF_HOUR

  return time
}

function hourRange(_: unknown, index: number) {
  const weekday = Math.floor(index / RANGES_PER_DAY) + 1
  const slot = index % RANGES_PER_DAY
  const range = { weekday, startsAt: hourOf(slot), endsAt: hourOf(slot + 1) }

  return range
}

function hourRow(_: unknown, index: number) {
  const { startsAt, endsAt, ...range } = hourRange(_, index)
  const times = { starts_at: startsAt, ends_at: endsAt }
  const row = { ...range, ...times, note: null }

  return row
}

const FULL_WEEK_LENGTH = { length: MAX_RANGES_PER_REQUEST }
const FULL_WEEK = Array.from(FULL_WEEK_LENGTH, hourRange)
const FULL_WEEK_ROWS = Array.from(FULL_WEEK_LENGTH, hourRow)
const EXTRA_RANGE = { weekday: 7, startsAt: '20:00', endsAt: '21:00' }
const MAX_NOTE = FILLER.repeat(NOTE_MAX_LENGTH)
const MON_MORNING = { weekday: 1, startsAt: '09:00', endsAt: '12:00' }
const MON_MORNING_ROW = {
  weekday: 1,
  starts_at: '09:00',
  ends_at: '12:00',
  note: null,
}
const MON_NOON = { weekday: 1, startsAt: '12:00', endsAt: '14:00' }
const MON_NOON_ROW = { ...MON_MORNING_ROW, starts_at: '12:00', ends_at: '14:00' }
const SUN_MORNING = { ...MON_MORNING, weekday: 7 }
const SUN_MORNING_ROW = { ...MON_MORNING_ROW, weekday: 7 }
const WED_ALL_DAY = { weekday: 3, startsAt: '00:00', endsAt: '24:00' }
const WED_ALL_DAY_ROW = {
  weekday: 3,
  starts_at: '00:00',
  ends_at: '24:00',
  note: null,
}
const LATE_END = { ...MON_MORNING, endsAt: '23:59' }
const LATE_END_ROW = { ...MON_MORNING_ROW, ends_at: '23:59' }
const PADDED_NOTE = { ...MON_MORNING, note: '  Focus  ' }
const TRIMMED_NOTE_ROW = { ...MON_MORNING_ROW, note: 'Focus' }
const PADDED_MAX_NOTE = { ...MON_MORNING, note: PAD + MAX_NOTE + PAD }
const MAX_NOTE_ROW = { ...MON_MORNING_ROW, note: MAX_NOTE }
const ONE_RANGE = { ranges: [MON_MORNING] }
const ONE_RANGE_CALLS = [[SAVE_RPC, { p_ranges: [MON_MORNING_ROW] }], [GET_RPC]]
const PROFILE_FILTERS = [[AUTH_ID_COLUMN, AUTH_USER_ID], [ACTIVE_COLUMN, true]]

const INVALID_BODIES: [string, unknown][] = [
  ['rejects a JSON null body', null],
  ['rejects a body without ranges', {}],
  ['rejects ranges that are not an array', { ranges: MON_MORNING }],
  ['rejects ranges set to null', { ranges: null }],
  ['rejects weekday 0', { ranges: [{ ...MON_MORNING, weekday: 0 }] }],
  ['rejects weekday 8', { ranges: [{ ...MON_MORNING, weekday: 8 }] }],
  ['rejects a string weekday', { ranges: [{ ...MON_MORNING, weekday: '1' }] }],
  ['rejects a fractional weekday', { ranges: [{ ...MON_MORNING, weekday: 1.5 }] }],
  ['rejects a missing weekday', { ranges: [{ startsAt: '09:00', endsAt: '12:00' }] }],
  ['rejects a missing start', { ranges: [{ weekday: 1, endsAt: '12:00' }] }],
  ['rejects a missing end', { ranges: [{ weekday: 1, startsAt: '09:00' }] }],
  ['rejects an unpadded start', { ranges: [{ ...MON_MORNING, startsAt: '9:00' }] }],
  ['rejects a start with seconds', { ranges: [{ ...MON_MORNING, startsAt: '09:00:00' }] }],
  ['rejects a start with spaces', { ranges: [{ ...MON_MORNING, startsAt: ' 09:00' }] }],
  ['rejects minute 60', { ranges: [{ ...MON_MORNING, startsAt: '08:60' }] }],
  ['rejects 24:00 as a start', { ranges: [{ ...MON_MORNING, startsAt: '24:00' }] }],
  ['rejects an end of 24:01', { ranges: [{ ...MON_MORNING, endsAt: '24:01' }] }],
  ['rejects an end of 25:00', { ranges: [{ ...MON_MORNING, endsAt: '25:00' }] }],
  ['rejects a note over the cap', { ranges: [{ ...MON_MORNING, note: MAX_NOTE + FILLER }] }],
  ['rejects a numeric note', { ranges: [{ ...MON_MORNING, note: 42 }] }],
  ['rejects a userId inside a range', { ranges: [{ ...MON_MORNING, userId: OTHER_ID }] }],
  ['rejects a top-level userId', { ...ONE_RANGE, userId: OTHER_ID }],
  ['rejects 71 ranges', { ranges: [...FULL_WEEK, EXTRA_RANGE] }],
  ['rejects a zero-length range', { ranges: [{ ...MON_MORNING, endsAt: '09:00' }] }],
  ['rejects a reversed range', { ranges: [{ ...MON_MORNING, startsAt: '13:00' }] }],
  ['rejects overlapping ranges', { ranges: [MON_MORNING, { ...MON_NOON, startsAt: '11:59' }] }],
  ['rejects a contained range', { ranges: [MON_MORNING, { ...MON_NOON, startsAt: '10:00' }] }],
  ['rejects a duplicated range', { ranges: [MON_MORNING, MON_MORNING] }],
]

const VALID_BODIES: [string, unknown, unknown[]][] = [
  ['accepts touching ranges', { ranges: [MON_MORNING, MON_NOON] }, [MON_MORNING_ROW, MON_NOON_ROW]],
  ['keeps the input order', { ranges: [MON_NOON, MON_MORNING] }, [MON_NOON_ROW, MON_MORNING_ROW]],
  ['accepts equal hours on two days', { ranges: [MON_MORNING, SUN_MORNING] }, [
    MON_MORNING_ROW,
    SUN_MORNING_ROW,
  ]],
  ['accepts 00:00 to 24:00', { ranges: [WED_ALL_DAY] }, [WED_ALL_DAY_ROW]],
  ['accepts 23:59 as an end', { ranges: [LATE_END] }, [LATE_END_ROW]],
  ['accepts an empty list, clearing every range', { ranges: [] }, []],
  ['accepts exactly 70 ranges', { ranges: FULL_WEEK }, FULL_WEEK_ROWS],
  ['trims a note before sending it', { ranges: [PADDED_NOTE] }, [TRIMMED_NOTE_ROW]],
  ['measures the note after trimming', { ranges: [PADDED_MAX_NOTE] }, [MAX_NOTE_ROW]],
  ['sends a blank note as null', { ranges: [{ ...MON_MORNING, note: PAD }] }, [MON_MORNING_ROW]],
  ['sends an empty note as null', { ranges: [{ ...MON_MORNING, note: '' }] }, [MON_MORNING_ROW]],
  ['sends a null note as null', { ranges: [{ ...MON_MORNING, note: null }] }, [MON_MORNING_ROW]],
]

beforeEach(() => {
  vi.clearAllMocks()
  requireModule.mockResolvedValue(GRANTED_ACCESS)
})

describe('availability route — module guard', () => {
  it('checks the tasks module on GET', async () => {
    installDb()
    await GET()
    expect(requireModule).toHaveBeenCalledTimes(1)
    expect(requireModule).toHaveBeenCalledWith(MODULE.TASKS)
  })

  it('checks the tasks module on PUT', async () => {
    installDb()
    await put(ONE_RANGE)
    expect(requireModule).toHaveBeenCalledTimes(1)
    expect(requireModule).toHaveBeenCalledWith(MODULE.TASKS)
  })

  it('answers a GET denial with its status and error, creating no client', async () => {
    requireModule.mockResolvedValue(DENIED_ACCESS)
    await expectError(await GET(), DENIED_STATUS, DENIED_ERROR)
    expect(ssrClient).not.toHaveBeenCalled()
  })

  it('answers a PUT denial without reading the body or creating a client', async () => {
    const request = putRaw(JSON.stringify(ONE_RANGE))
    const readBody = vi.spyOn(request, JSON_METHOD)

    requireModule.mockResolvedValue(DENIED_ACCESS)
    await expectError(await PUT(request), DENIED_STATUS, DENIED_ERROR)
    expect(readBody).not.toHaveBeenCalled()
    expect(ssrClient).not.toHaveBeenCalled()
  })
})

describe('availability route — viewer profile', () => {
  it('looks up only the active profile behind the session', async () => {
    const { from, query } = installDb()

    await GET()
    expect(from).toHaveBeenCalledWith(TABLES.usuarios)
    expect(query.select).toHaveBeenCalledWith(ID_COLUMN)
    expect(query.eq.mock.calls).toEqual(PROFILE_FILTERS)
    expect(query.maybeSingle).toHaveBeenCalledTimes(1)
  })

  it('refuses GET without a session user id', async () => {
    const { rpc } = installDb()

    requireModule.mockResolvedValue(ANONYMOUS_GRANT)
    await expectError(await GET(), PROFILE_STATUS, PROFILE_UNAVAILABLE_MESSAGE)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('refuses PUT without a session user id', async () => {
    const { rpc } = installDb()

    requireModule.mockResolvedValue(ANONYMOUS_GRANT)
    await expectError(await put(ONE_RANGE), PROFILE_STATUS, PROFILE_UNAVAILABLE_MESSAGE)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('refuses GET when no active profile exists', async () => {
    const { rpc } = installDb(NO_PROFILE)

    await expectError(await GET(), PROFILE_STATUS, PROFILE_UNAVAILABLE_MESSAGE)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('refuses PUT without an active profile before reading the body', async () => {
    const { rpc } = installDb(NO_PROFILE)
    const request = putRaw(JSON.stringify(ONE_RANGE))
    const readBody = vi.spyOn(request, JSON_METHOD)

    await expectError(await PUT(request), PROFILE_STATUS, PROFILE_UNAVAILABLE_MESSAGE)
    expect(readBody).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('availability route — GET', () => {
  it('answers 200 with no-store and the grouped availability', async () => {
    installDb()

    const response = await GET()

    expect(response.status).toBe(OK_STATUS)
    expect(response.headers.get(CACHE_CONTROL_HEADER)).toBe(NO_STORE)
    expect(await response.json()).toEqual(EXPECTED_RESPONSE)
  })

  it('calls the visibility RPC once with no arguments', async () => {
    const { rpc } = installDb()

    await GET()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith(GET_RPC)
  })

  it('keeps a member with no ranges as an empty list', async () => {
    readWith([MEMBER_ONLY_ROW])
    expect(await (await GET()).json()).toEqual(RANGELESS_RESPONSE)
  })

  it('reports a partially joined team or workday as null', async () => {
    readWith([PARTIAL_JOIN_ROW])
    expect((await (await GET()).json()).members).toEqual([PARTIAL_MEMBER])
  })

  it('keeps a workday of zero hours per week', async () => {
    readWith([ZERO_HOURS_ROW])
    expect((await (await GET()).json()).members[0].workday).toEqual(ZERO_HOURS_WORKDAY)
  })

  it('answers an empty member list when nothing is visible', async () => {
    readWith([])
    expect(await (await GET()).json()).toEqual(EMPTY_RESPONSE)
  })

  it('answers 500 when the RPC fails, even with data', async () => {
    installDb(READ_FAILS_WITH_DATA)
    await expectError(await GET(), LOAD_FAILED_STATUS, LOAD_FAILED_MESSAGE)
  })

  it('answers 500 when the RPC returns null data', async () => {
    installDb(READ_NULL_DATA)
    await expectError(await GET(), LOAD_FAILED_STATUS, LOAD_FAILED_MESSAGE)
  })
})

describe('availability route — PUT validation', () => {
  it('rejects a body that is not JSON', async () => {
    const { rpc } = installDb()

    await expectError(await PUT(putRaw(NOT_JSON)), INVALID_STATUS, INVALID_RANGES_MESSAGE)
    expect(rpc).not.toHaveBeenCalled()
  })

  INVALID_BODIES.forEach(([title, body]) => {
    it(title, async () => {
      const { rpc } = installDb()

      await expectError(await put(body), INVALID_STATUS, INVALID_RANGES_MESSAGE)
      expect(rpc).not.toHaveBeenCalled()
    })
  })
})

describe('availability route — PUT save', () => {
  VALID_BODIES.forEach(([title, body, rows]) => {
    it(title, async () => {
      const { rpc } = installDb()
      const expectedArgs = { p_ranges: rows }

      expect((await put(body)).status).toBe(OK_STATUS)
      expect(rpc).toHaveBeenCalledWith(SAVE_RPC, expectedArgs)
    })
  })

  it('saves first, then re-reads with no arguments', async () => {
    const { rpc } = installDb()

    await put(ONE_RANGE)
    expect(rpc.mock.calls).toEqual(ONE_RANGE_CALLS)
  })

  it('answers a stored body like GET', async () => {
    installDb()

    const response = await put(ONE_RANGE)

    expect(response.headers.get(CACHE_CONTROL_HEADER)).toBe(NO_STORE)
    expect(await response.json()).toEqual(EXPECTED_RESPONSE)
  })

  it('maps the exclusion violation to 409 without re-reading', async () => {
    const { rpc } = installDb(SAVE_CONFLICTS)

    await expectError(await put(ONE_RANGE), CONFLICT_STATUS, SAVE_CONFLICT_MESSAGE)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('maps any other save error to 400 without re-reading', async () => {
    const { rpc } = installDb(SAVE_FAILS)

    await expectError(await put(ONE_RANGE), SAVE_FAILED_STATUS, SAVE_FAILED_MESSAGE)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('answers 500 when the re-read after a save fails', async () => {
    installDb(READ_FAILS)
    await expectError(await put(ONE_RANGE), LOAD_FAILED_STATUS, LOAD_FAILED_MESSAGE)
  })
})
