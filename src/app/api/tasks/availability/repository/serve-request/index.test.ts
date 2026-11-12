import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { NextRequest } from 'next/server'
import {
  EXCLUSION_VIOLATION_CODE,
  INVALID_RANGES_STATUS,
  NOTE_MAX_LENGTH,
  PROFILE_UNAVAILABLE_STATUS,
  SAVE_CONFLICT_STATUS,
  SAVE_FAILED_STATUS,
} from '@/app/api/tasks/availability/constants'
import {
  CACHE_CONTROL_HEADER,
  DENIED_ACCESS,
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

// The suite drives serveRequest through the route, so the module guard stays covered too.
// Named via vi.hoisted so the paths exist before Vitest hoists the vi.mock calls below them.
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

const OK_STATUS = 200
const ONE_RANGE_BODY = { ranges: [{ weekday: 1, startsAt: '09:00', endsAt: '12:00' }] }

const activeRangeRow = {
  user_id: VIEWER_ID,
  first_name: 'Ada',
  last_name: 'Lovelace',
  team_id: null,
  team_name: null,
  workday_id: null,
  workday_name: null,
  hours_per_week: null,
  range_id: 'range-1',
  weekday: 1,
  starts_at: '09:00:00',
  ends_at: '12:00:00',
  note: null,
}

type DbOptions = {
  viewerId?: string | null
  visibleRows?: unknown[]
  saveErrorCode?: string | null
}
const DEFAULT_DB: Required<DbOptions> = {
  viewerId: VIEWER_ID,
  visibleRows: [activeRangeRow],
  saveErrorCode: null,
}
const NO_OVERRIDES: DbOptions = {}

function putRequest(body: unknown) {
  const requestInit = { method: 'PUT', body: JSON.stringify(body) }

  return new NextRequest(ROUTE_URL, requestInit)
}

function rpcWith(visibleRows: unknown[], saveErrorCode: string | null) {
  const visibleResult = { data: visibleRows, error: null }
  const saveError = saveErrorCode === null ? null : { code: saveErrorCode }
  const saveResult = { data: saveError === null ? [] : null, error: saveError }

  return vi.fn(async (name: string) => (name === GET_RPC ? visibleResult : saveResult))
}

function fromWith(viewerId: string | null) {
  const viewerRow = viewerId === null ? null : { id: viewerId }
  const single = { maybeSingle: async () => ({ data: viewerRow }) }
  const select = () => ({ eq: () => ({ eq: () => single }) })

  return vi.fn(() => ({ select }))
}

function dbWith(overrides: DbOptions = NO_OVERRIDES) {
  const { viewerId, visibleRows, saveErrorCode } = { ...DEFAULT_DB, ...overrides }
  const dbHandle = { from: fromWith(viewerId), rpc: rpcWith(visibleRows, saveErrorCode) }

  ssrClient.mockReturnValue(dbHandle)

  return dbHandle
}

async function putStatus(body: unknown) {
  const response = await PUT(putRequest(body))

  return response.status
}

beforeEach(() => {
  vi.clearAllMocks()
  requireModule.mockResolvedValue(GRANTED_ACCESS)
})

describe('weekly availability API — access', () => {
  it('denies access before touching the database', async () => {
    requireModule.mockResolvedValue(DENIED_ACCESS)
    expect((await GET()).status).toBe(DENIED_STATUS)
    expect(ssrClient).not.toHaveBeenCalled()
  })

  it('denies PUT before parsing its body or creating a database client', async () => {
    const request = new NextRequest(ROUTE_URL)
    const parseBody = vi.spyOn(request, JSON_METHOD)

    requireModule.mockResolvedValue(DENIED_ACCESS)
    expect((await PUT(request)).status).toBe(DENIED_STATUS)
    expect(parseBody).not.toHaveBeenCalled()
    expect(ssrClient).not.toHaveBeenCalled()
  })

  it('rejects GET when the caller has no active profile', async () => {
    const noViewerOptions = { viewerId: null }

    dbWith(noViewerOptions)
    expect((await GET()).status).toBe(PROFILE_UNAVAILABLE_STATUS)
  })
})

describe('weekly availability API — GET', () => {
  it('serves GET with no-store and canonical HH:mm ranges', async () => {
    const expectedRange = {
      id: 'range-1',
      weekday: 1,
      startsAt: '09:00',
      endsAt: '12:00',
      note: null,
    }

    dbWith()

    const response = await GET()
    const body = await response.json()

    expect(response.headers.get(CACHE_CONTROL_HEADER)).toBe(NO_STORE)
    expect(body.viewerUserId).toBe(VIEWER_ID)
    expect(body.members[0].ranges[0]).toEqual(expectedRange)
  })

  it('reports an inactive jornada as workday: null', async () => {
    const inactiveWorkdayRow = {
      ...activeRangeRow,
      workday_id: null,
      workday_name: null,
      hours_per_week: null,
    }
    const inactiveWorkdayOptions = { visibleRows: [inactiveWorkdayRow] }

    dbWith(inactiveWorkdayOptions)

    const body = await (await GET()).json()

    expect(body.members[0].workday).toBeNull()
  })
})

describe('weekly availability API — PUT validation', () => {
  it('rejects a PUT body without ranges', async () => {
    const emptyBody = {}

    dbWith()
    expect(await putStatus(emptyBody)).toBe(INVALID_RANGES_STATUS)
  })

  it('rejects an invalid weekday, time, or note length', async () => {
    const invalidWeekday = { ranges: [{ weekday: 8, startsAt: '09:00', endsAt: '12:00' }] }
    const invalidTime = { ranges: [{ weekday: 1, startsAt: '9:00', endsAt: '12:00' }] }
    const tooLongNote = {
      weekday: 1,
      startsAt: '09:00',
      endsAt: '12:00',
      note: 'x'.repeat(NOTE_MAX_LENGTH + 1),
    }
    const invalidBodies = [invalidWeekday, invalidTime, { ranges: [tooLongNote] }]

    dbWith()

    for (const invalidBody of invalidBodies) {
      expect(await putStatus(invalidBody)).toBe(INVALID_RANGES_STATUS)
    }
  })

  it('rejects an overlap before calling the save RPC', async () => {
    const { rpc } = dbWith()
    const overlapping = {
      ranges: [
        { weekday: 1, startsAt: '09:00', endsAt: '13:00' },
        { weekday: 1, startsAt: '12:00', endsAt: '14:00' },
      ],
    }

    expect(await putStatus(overlapping)).toBe(INVALID_RANGES_STATUS)
    expect(rpc).not.toHaveBeenCalledWith(SAVE_RPC, expect.anything())
  })

  it('never accepts or forwards a target user id', async () => {
    const { rpc } = dbWith()
    const withUserId = { ...ONE_RANGE_BODY, userId: 'someone-else' }

    expect(await putStatus(withUserId)).toBe(INVALID_RANGES_STATUS)
    expect(rpc).not.toHaveBeenCalledWith(SAVE_RPC, expect.anything())
  })
})

describe('weekly availability API — PUT save', () => {
  it('calls the save RPC with only the normalized ranges', async () => {
    const { rpc } = dbWith()
    const savedRange = {
      weekday: 1,
      startsAt: '09:00',
      endsAt: '12:00',
      note: '  Notes  ',
    }
    const expectedRow = {
      weekday: 1,
      starts_at: '09:00',
      ends_at: '12:00',
      note: 'Notes',
    }
    const expectedArgs = { p_ranges: [expectedRow] }
    const savedBody = { ranges: [savedRange] }

    expect(await putStatus(savedBody)).toBe(OK_STATUS)
    expect(rpc).toHaveBeenCalledWith(SAVE_RPC, expectedArgs)
  })

  it('maps the exclusion-violation SQLSTATE to 409', async () => {
    const conflictOptions = { saveErrorCode: EXCLUSION_VIOLATION_CODE }

    dbWith(conflictOptions)
    expect(await putStatus(ONE_RANGE_BODY)).toBe(SAVE_CONFLICT_STATUS)
  })

  it('maps any other save error to 400', async () => {
    const otherErrorOptions = { saveErrorCode: RLS_VIOLATION_CODE }

    dbWith(otherErrorOptions)
    expect(await putStatus(ONE_RANGE_BODY)).toBe(SAVE_FAILED_STATUS)
  })
})
