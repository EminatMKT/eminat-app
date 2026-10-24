import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { NextRequest } from 'next/server'
import { RPCS } from '@/shared/schema'
import { EXCLUSION_VIOLATION_CODE } from './constants'

const {
  requireModule,
  ssrClient,
} = vi.hoisted(() => ({ requireModule: vi.fn(), ssrClient: vi.fn() }))
vi.mock('@/shared/db/requireAccess/requireModule', () => ({ default: requireModule }))
vi.mock('@/shared/db/requireAccess/ssrClient', () => ({ default: ssrClient }))
import { GET, PUT } from './route'

const AUTH_USER_ID = 'auth-1'
const VIEWER_ID = 'viewer-1'
const BASE_URL = 'http://localhost/api/tasks/availability'
const GET_RPC = RPCS.getVisibleWeeklyAvailability
const SAVE_RPC = RPCS.replaceOwnWeeklyAvailability

function putRequest(body: unknown) {
  const requestBody = JSON.stringify(body)
  const requestInit = { method: 'PUT', body: requestBody }
  return new NextRequest(BASE_URL, requestInit)
}

const activeRangeRow = {
  user_id: VIEWER_ID,
  first_name: 'Ada',
  last_name: 'Lovelace',
  team_id: null,
  team_name: null,
  workday_id: null,
  workday_name: null,
  hours_per_day: null,
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
const DEFAULT_DB_OPTIONS: DbOptions = {}

function dbWith({
  viewerId = VIEWER_ID,
  visibleRows = [activeRangeRow],
  saveErrorCode = null,
}: DbOptions = DEFAULT_DB_OPTIONS) {
  const rpc = vi.fn(async (name: string) => {
    if (name === GET_RPC) {
      const visibleResult = { data: visibleRows, error: null }
      return visibleResult
    }
    const savedRows = saveErrorCode === null ? [] : null
    const saveErrorResult = saveErrorCode === null ? null : { code: saveErrorCode }
    const saveResult = { data: savedRows, error: saveErrorResult }
    return saveResult
  })
  const viewerRow = viewerId === null ? null : { id: viewerId }
  const from = vi.fn(() => ({
    select: () => ({
      eq: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: viewerRow }) }),
      }),
    }),
  }))
  const dbHandle = { from, rpc }
  ssrClient.mockReturnValue(dbHandle)
  return { from, rpc }
}

beforeEach(() => {
  vi.clearAllMocks()
  const grantedAccess = { ok: true, userId: AUTH_USER_ID }
  requireModule.mockResolvedValue(grantedAccess)
})

describe('weekly availability API', () => {
  it('denies access before touching the database', async () => {
    const deniedAccess = { ok: false, status: 403, error: 'Forbidden' }
    requireModule.mockResolvedValue(deniedAccess)
    expect((await GET()).status).toBe(403)
    expect(ssrClient).not.toHaveBeenCalled()
  })

  it('serves GET with no-store and canonical HH:mm ranges', async () => {
    dbWith()
    const response = await GET()
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await response.json()
    expect(body.viewerUserId).toBe(VIEWER_ID)
    const expectedRange = {
      id: 'range-1',
      weekday: 1,
      startsAt: '09:00',
      endsAt: '12:00',
      note: null,
    }
    expect(body.members[0].ranges[0]).toEqual(expectedRange)
  })

  it('reports an inactive jornada as workday: null', async () => {
    const inactiveWorkdayRow = {
      ...activeRangeRow,
      workday_id: null,
      workday_name: null,
      hours_per_day: null,
    }
    const inactiveWorkdayOptions = { visibleRows: [inactiveWorkdayRow] }
    dbWith(inactiveWorkdayOptions)
    const body = await (await GET()).json()
    expect(body.members[0].workday).toBeNull()
  })

  it('rejects GET when the caller has no active profile', async () => {
    const noViewerOptions = { viewerId: null }
    dbWith(noViewerOptions)
    expect((await GET()).status).toBe(403)
  })

  it('rejects a PUT body without ranges', async () => {
    dbWith()
    const emptyBody = {}
    expect((await PUT(putRequest(emptyBody))).status).toBe(400)
  })

  it('rejects an invalid weekday, time, or note length', async () => {
    dbWith()
    const invalidWeekday = { ranges: [{ weekday: 8, startsAt: '09:00', endsAt: '12:00' }] }
    const invalidTime = { ranges: [{ weekday: 1, startsAt: '9:00', endsAt: '12:00' }] }
    const tooLongNote = {
      weekday: 1,
      startsAt: '09:00',
      endsAt: '12:00',
      note: 'x'.repeat(281),
    }
    const invalidNote = { ranges: [tooLongNote] }
    expect((await PUT(putRequest(invalidWeekday))).status).toBe(400)
    expect((await PUT(putRequest(invalidTime))).status).toBe(400)
    expect((await PUT(putRequest(invalidNote))).status).toBe(400)
  })

  it('rejects an overlap before calling the save RPC', async () => {
    const { rpc } = dbWith()
    const overlapping = {
      ranges: [
        { weekday: 1, startsAt: '09:00', endsAt: '13:00' },
        { weekday: 1, startsAt: '12:00', endsAt: '14:00' },
      ],
    }
    expect((await PUT(putRequest(overlapping))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalledWith(SAVE_RPC, expect.anything())
  })

  it('never accepts or forwards a target user id', async () => {
    const { rpc } = dbWith()
    const withUserId = {
      ranges: [{ weekday: 1, startsAt: '09:00', endsAt: '12:00' }],
      userId: 'someone-else',
    }
    expect((await PUT(putRequest(withUserId))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalledWith(SAVE_RPC, expect.anything())
  })

  it('calls the save RPC with only the normalized ranges', async () => {
    const { rpc } = dbWith()
    const savedRange = {
      weekday: 1,
      startsAt: '09:00',
      endsAt: '12:00',
      note: '  Notes  ',
    }
    const oneRange = { ranges: [savedRange] }
    expect((await PUT(putRequest(oneRange))).status).toBe(200)
    const expectedRow = {
      weekday: 1,
      starts_at: '09:00',
      ends_at: '12:00',
      note: 'Notes',
    }
    const expectedArgs = { p_ranges: [expectedRow] }
    expect(rpc).toHaveBeenCalledWith(SAVE_RPC, expectedArgs)
  })

  it('maps the exclusion-violation SQLSTATE to 409', async () => {
    const conflictOptions = { saveErrorCode: EXCLUSION_VIOLATION_CODE }
    dbWith(conflictOptions)
    const oneRange = { ranges: [{ weekday: 1, startsAt: '09:00', endsAt: '12:00' }] }
    expect((await PUT(putRequest(oneRange))).status).toBe(409)
  })

  it('maps any other save error to 400', async () => {
    const otherErrorOptions = { saveErrorCode: '42501' }
    dbWith(otherErrorOptions)
    const oneRange = { ranges: [{ weekday: 1, startsAt: '09:00', endsAt: '12:00' }] }
    expect((await PUT(putRequest(oneRange))).status).toBe(400)
  })
})
